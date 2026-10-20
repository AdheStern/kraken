// src/server/tickets/delete-ticket-attachment-record.ts
// Quita un adjunto de un ticket abierto: lo puede quitar quien lo subió o quien cierra el ticket (AGENTS.md §2.9).
// Devuelve la referencia para borrar el archivo del FileStore después de confirmar la transacción.
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCloseTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { loadTicketAccess } from "./load-ticket-access";

export async function deleteTicketAttachmentRecord(
  tx: Tx,
  user: SessionUser,
  { attachmentId }: { attachmentId: string },
): Promise<
  ActionResult<{ storagePath: string; fileName: string; ticketId: string }>
> {
  const attachment = await tx.ticketAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      ticketId: true,
      fileName: true,
      storagePath: true,
      uploadedById: true,
      ticket: { select: { status: true } },
    },
  });
  if (!attachment) return actionError("NOT_FOUND", "El adjunto ya no existe.");
  const access = await loadTicketAccess(tx, attachment.ticketId);
  const allowed =
    attachment.uploadedById === user.id ||
    (access !== null && canCloseTicket(user, access));
  if (!allowed)
    return actionError(
      "FORBIDDEN",
      "Solo quien lo subió o quien cierra el ticket quita un adjunto.",
    );
  if (attachment.ticket.status === "CERRADO")
    return actionError(
      "INVALID_STATE",
      "El ticket está cerrado; sus adjuntos se conservan.",
    );
  await tx.ticketAttachment.delete({ where: { id: attachmentId } });
  return actionOk({
    storagePath: attachment.storagePath,
    fileName: attachment.fileName,
    ticketId: attachment.ticketId,
  });
}
