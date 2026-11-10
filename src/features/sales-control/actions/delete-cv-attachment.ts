// src/features/sales-control/actions/delete-cv-attachment.ts
// Quita un adjunto del CV y borra su archivo del almacén (AGENTS.md §2.9, ADR-16).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { selectFileStore } from "@/server/files/select-file-store";
import { log } from "@/server/log";
import { runUserAction } from "@/server/run-user-action";
import { deleteCvAttachmentRecord } from "@/server/sales-control/delete-cv-attachment-record";

const schema = z.object({ attachmentId: z.uuid() });

export async function deleteCvAttachment(
  input: z.infer<typeof schema>,
): Promise<ActionResult<null>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return actionError("VALIDATION", "Adjunto inválido.");
  const result = await runUserAction("deleteCvAttachment", (tx, user) =>
    deleteCvAttachmentRecord(tx, user, parsed.data.attachmentId),
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
