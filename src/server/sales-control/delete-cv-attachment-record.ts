// src/server/sales-control/delete-cv-attachment-record.ts
// Quita el registro de un adjunto del CV (quien lo subió o Administración, en cualquier estado del CV) y lo
// audita; devuelve la referencia para borrar el archivo después de confirmar la transacción (AGENTS.md §2.9).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canDeleteCvAttachment } from "@/server/authz/cv-attachment-permissions";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { loadCvAttachmentAccess } from "./cv-attachment-access";

export async function deleteCvAttachmentRecord(
  tx: Tx,
  user: SessionUser,
  attachmentId: string,
): Promise<ActionResult<{ storagePath: string }>> {
  const attachment = await tx.cvAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      cvId: true,
      fileName: true,
      storagePath: true,
      uploadedById: true,
    },
  });
  if (!attachment) return actionError("NOT_FOUND", "El adjunto ya no existe.");
  const found = await loadCvAttachmentAccess(user, attachment.cvId, tx);
  if (
    !found ||
    !canDeleteCvAttachment(user, found.access, attachment.uploadedById)
  )
    return actionError(
      "FORBIDDEN",
      "Solo quien lo subió o Administración quita un adjunto.",
    );
  await tx.cvAttachment.delete({ where: { id: attachmentId } });
  await recordAudit(tx, {
    actorId: user.id,
    entity: "cv.adjunto",
    entityId: attachmentId,
    action: "QUITAR",
    before: { cvId: attachment.cvId, fileName: attachment.fileName },
  });
  return actionOk({ storagePath: attachment.storagePath });
}
