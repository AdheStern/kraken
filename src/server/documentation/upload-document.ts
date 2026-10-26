// src/server/documentation/upload-document.ts
// Sube un documento a una fase de un proyecto de documentación y lo registra con su hash (AGENTS.md §2.10, ADR-16).
// POR QUÉ: la subida va fuera de la transacción; si el registro falla se borra el archivo para no dejar huérfanos.
import { createHash } from "node:crypto";
import { toUniqueFileName } from "@/domain/documentation/unique-file-name";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { prisma, runInTransaction } from "@/server/db";
import {
  FileConflictError,
  type FileStore,
  MAX_ATTACHMENT_BYTES,
  type StoredFile,
} from "@/server/files/file-store";
import {
  toSafeFileName,
  toSafeFolderName,
} from "@/server/files/safe-file-name";
import { log } from "@/server/log";

type Target = { projectId: string; phaseId: string };
type Uploaded = { documentId: string; fileName: string };

const MAX_NAME_ATTEMPTS = 5;

export async function uploadDocument(
  user: SessionUser,
  target: Target,
  file: File,
  store: FileStore,
): Promise<ActionResult<Uploaded>> {
  if (file.size === 0)
    return actionError("VALIDATION", "El archivo está vacío.");
  if (file.size > MAX_ATTACHMENT_BYTES)
    return actionError(
      "VALIDATION",
      "El archivo pesa más de 20 MB; comprímelo o súbelo por partes.",
    );
  if (!canUseDocumentation(user))
    return actionError("FORBIDDEN", "No tienes acceso a la documentación.");
  const [project, phase, existing] = await Promise.all([
    prisma.docProject.findFirst({
      where: { AND: [{ id: target.projectId }, scopeDocProjectQuery(user)] },
      select: { name: true, customer: { select: { name: true } } },
    }),
    prisma.docPhase.findUnique({ where: { id: target.phaseId } }),
    prisma.docDocument.findMany({ where: target, select: { fileName: true } }),
  ]);
  if (!project || !phase)
    return actionError("NOT_FOUND", "El proyecto o la fase ya no existen.");
  if (!phase.isActive) return inactivePhase();

  const data = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  // LIMITACIÓN: renombrar el proyecto o la fase no mueve lo ya subido; el enlace es el id del elemento.
  const folder = [
    "documentacion",
    toSafeFolderName(project.customer.name),
    toSafeFolderName(project.name),
    toSafeFolderName(phase.name),
  ].join("/");
  const put = await putWithFreeName(store, folder, {
    name: toSafeFileName(file.name),
    taken: existing.map((d) => d.fileName),
    data,
    mimeType,
  });
  if (!put)
    return actionError(
      "CONFLICT",
      "Ya existe un documento con ese nombre en esta fase; cámbiale el nombre y vuelve a intentarlo.",
    );
  try {
    return await runInTransaction(async (tx) => {
      // TRAMPA: la fase pudo darse de baja o el proyecto borrarse mientras subía; se revalida aquí.
      const current = await tx.docPhase.findUnique({
        where: { id: target.phaseId },
        select: { isActive: true },
      });
      if (!current?.isActive) throw new DocumentRejected();
      const document = await tx.docDocument.create({
        data: {
          ...target,
          fileName: put.fileName,
          storagePath: put.stored.storagePath,
          sha256: createHash("sha256").update(data).digest("hex"),
          sizeBytes: data.byteLength,
          mimeType,
          uploadedById: user.id,
        },
        select: { id: true },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "doc.documento",
        entityId: document.id,
        action: "SUBIR",
        after: {
          ...target,
          fileName: put.fileName,
          sizeBytes: data.byteLength,
          store: store.name,
        },
      });
      return actionOk({ documentId: document.id, fileName: put.fileName });
    });
  } catch (error) {
    await store.remove(put.stored.storagePath).catch((e: unknown) =>
      log("warn", "documento huérfano sin borrar", {
        storagePath: put.stored.storagePath,
        error: String(e),
      }),
    );
    if (error instanceof DocumentRejected) return inactivePhase();
    throw error;
  }
}

class DocumentRejected extends Error {}

const inactivePhase = () =>
  actionError(
    "INVALID_STATE",
    "La fase está dada de baja; no admite documentos nuevos.",
  );

type Content = {
  name: string;
  taken: string[];
  data: Uint8Array;
  mimeType: string;
};

// POR QUÉ: la carpeta puede tener ese nombre por otra subida simultánea o por otro proyecto con el mismo nombre;
// se prueba el siguiente sufijo en vez de pisar el archivo.
async function putWithFreeName(
  store: FileStore,
  folder: string,
  { name, taken, data, mimeType }: Content,
): Promise<{ stored: StoredFile; fileName: string } | null> {
  const tried = [...taken];
  for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
    const fileName = toUniqueFileName(name, tried);
    try {
      const stored = await store.put(`${folder}/${fileName}`, data, mimeType);
      return { stored, fileName };
    } catch (error) {
      if (!(error instanceof FileConflictError)) throw error;
      tried.push(fileName);
    }
  }
  return null;
}
