// src/features/tickets/actions/delete-ticket-attachment.ts
// Quita un adjunto de un ticket abierto y borra su archivo (AGENTS.md §2.6, ADR-16).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { selectFileStore } from "@/server/files/select-file-store";
import { log } from "@/server/log";
import { runUserAction } from "@/server/run-user-action";
import { deleteTicketAttachmentRecord } from "@/server/tickets/delete-ticket-attachment-record";

const schema = z.object({ attachmentId: z.uuid() });

export async function deleteTicketAttachment(
  input: z.infer<typeof schema>,
): Promise<ActionResult<null>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return actionError("VALIDATION", "Adjunto inválido.");
  const result = await runUserAction(
    "deleteTicketAttachment",
    async (tx, user) => {
      const deleted = await deleteTicketAttachmentRecord(tx, user, parsed.data);
      if (deleted.ok)
        await recordAudit(tx, {
          actorId: user.id,
          entity: "tickets.adjunto",
          entityId: parsed.data.attachmentId,
          action: "QUITAR",
          before: {
            ticketId: deleted.data.ticketId,
            fileName: deleted.data.fileName,
          },
        });
      return deleted;
    },
  );
  if (!result.ok) return result;
  // POR QUÉ: el archivo se borra después de confirmar; si falla queda huérfano en el almacén, nunca un registro roto.
  await selectFileStore()
    ?.remove(result.data.storagePath)
    .catch((error: unknown) =>
      log("warn", "adjunto huérfano sin borrar", {
        storagePath: result.data.storagePath,
        error: String(error),
      }),
    );
  return actionOk(null);
}
