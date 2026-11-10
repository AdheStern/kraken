// src/server/sales-control/upload-cv-attachment.ts
// Sube un adjunto del CV (OC del cliente u otro documento) al FileStore y registra su ruta y hash (AGENTS.md
// §2.1, ADR-16). POR QUÉ: la subida va fuera de la transacción; si el registro falla se borra el archivo.
import { createHash, randomUUID } from "node:crypto";
import type { CvAttachmentKind } from "@/generated/prisma/enums";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canUploadCvAttachment } from "@/server/authz/cv-attachment-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { runInTransaction } from "@/server/db";
import {
  type FileStore,
  MAX_ATTACHMENT_BYTES,
} from "@/server/files/file-store";
import { toSafeFileName } from "@/server/files/safe-file-name";
import { log } from "@/server/log";
import { loadCvAttachmentAccess } from "./cv-attachment-access";

type Input = { cvId: string; kind: CvAttachmentKind; file: File };

export async function uploadCvAttachment(
  user: SessionUser,
  { cvId, kind, file }: Input,
  store: FileStore,
): Promise<ActionResult<{ attachmentId: string }>> {
  if (file.size === 0)
    return actionError("VALIDATION", "El archivo está vacío.");
  if (file.size > MAX_ATTACHMENT_BYTES)
    return actionError(
      "VALIDATION",
      "El archivo pesa más de 20 MB; comprímelo o súbelo por partes.",
    );
  const found = await loadCvAttachmentAccess(user, cvId);
  if (!found) return actionError("NOT_FOUND", "El CV ya no existe.");
  if (!canUploadCvAttachment(user, found.access))
    return actionError(
      "FORBIDDEN",
      "Solo quienes editan el CV o su cabecera adjuntan archivos.",
    );

  const data = new Uint8Array(await file.arrayBuffer());
  const fileName = toSafeFileName(file.name);
  const mimeType = file.type || "application/octet-stream";
  const stored = await store.put(
    `cv/${found.code}/${randomUUID()}-${fileName}`,
    data,
    mimeType,
  );
  try {
    return await runInTransaction(async (tx) => {
      // TRAMPA: el usuario pudo perder el acceso mientras subía; se revalida dentro de la transacción.
      const current = await loadCvAttachmentAccess(user, cvId, tx);
      if (!current || !canUploadCvAttachment(user, current.access))
        throw new AttachmentRejected("Ya no puedes adjuntar en este CV.");
      const attachment = await tx.cvAttachment.create({
        data: {
          cvId,
          versionId: current.versionId,
          kind,
          fileName,
          storagePath: stored.storagePath,
          sha256: createHash("sha256").update(data).digest("hex"),
          sizeBytes: data.byteLength,
          mimeType,
          uploadedById: user.id,
        },
        select: { id: true },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "cv.adjunto",
        entityId: attachment.id,
        action: "SUBIR",
        after: {
          cvId,
          kind,
          fileName,
          sizeBytes: data.byteLength,
          store: store.name,
        },
      });
      return actionOk({ attachmentId: attachment.id });
    });
  } catch (error) {
    await store.remove(stored.storagePath).catch((e: unknown) =>
      log("warn", "adjunto huérfano sin borrar", {
        storagePath: stored.storagePath,
        error: String(e),
      }),
    );
    if (error instanceof AttachmentRejected)
      return actionError("FORBIDDEN", error.message);
    throw error;
  }
}

class AttachmentRejected extends Error {}
