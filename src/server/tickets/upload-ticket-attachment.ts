// src/server/tickets/upload-ticket-attachment.ts
// Sube un adjunto de un ticket al FileStore y registra su ruta y hash en la base (ADR-16, AGENTS.md §2.6).
// POR QUÉ: la subida va fuera de la transacción; si el registro falla se borra el archivo para no dejar huérfanos.
import { createHash, randomUUID } from "node:crypto";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import type { SessionUser } from "@/server/authz/roles";
import { canCommentTicket } from "@/server/authz/ticket-permissions";
import { prisma, runInTransaction } from "@/server/db";
import {
  type FileStore,
  MAX_ATTACHMENT_BYTES,
} from "@/server/files/file-store";
import { log } from "@/server/log";
import { loadTicketAccess } from "./load-ticket-access";

export async function uploadTicketAttachment(
  user: SessionUser,
  ticketId: string,
  file: File,
  store: FileStore,
): Promise<ActionResult<{ attachmentId: string }>> {
  if (file.size === 0)
    return actionError("VALIDATION", "El archivo está vacío.");
  if (file.size > MAX_ATTACHMENT_BYTES)
    return actionError(
      "VALIDATION",
      "El archivo pesa más de 20 MB; comprímelo o súbelo por partes.",
    );
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { number: true, status: true },
  });
  const access = await loadTicketAccess(prisma, ticketId);
  if (!ticket || !access)
    return actionError("NOT_FOUND", "El ticket ya no existe.");
  if (!canCommentTicket(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo quienes trabajan o gestionan el ticket suben adjuntos.",
    );
  if (ticket.status === "CANCELADO")
    return actionError(
      "INVALID_STATE",
      "El ticket está cancelado; no admite adjuntos.",
    );

  const data = new Uint8Array(await file.arrayBuffer());
  const fileName = toSafeName(file.name);
  const mimeType = file.type || "application/octet-stream";
  const stored = await store.put(
    `tickets/${ticket.number}/${randomUUID()}-${fileName}`,
    data,
    mimeType,
  );
  try {
    return await runInTransaction(async (tx) => {
      const attachment = await tx.ticketAttachment.create({
        data: {
          ticketId,
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
        entity: "tickets.adjunto",
        entityId: attachment.id,
        action: "SUBIR",
        after: {
          ticketId,
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
    throw error;
  }
}

// TRAMPA: el nombre llega del navegador; se quitan rutas y caracteres que SharePoint o Windows rechazan.
function toSafeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "archivo";
  const clean = base.replace(/[:*?"<>|#%]/g, "_").trim();
  return (clean || "archivo").slice(-150);
}
