// src/features/tickets/actions/upload-ticket-attachment.ts
// Sube un adjunto a un ticket desde la pestaña Adjuntos (AGENTS.md §2.6, ADR-16).
"use server";

import { z } from "zod";
import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { selectFileStore } from "@/server/files/select-file-store";
import { getSessionUser } from "@/server/session";
import { uploadTicketAttachment as upload } from "@/server/tickets/upload-ticket-attachment";

const ticketIdSchema = z.uuid();

export async function uploadTicketAttachment(
  form: FormData,
): Promise<ActionResult<{ attachmentId: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const ticketId = ticketIdSchema.safeParse(form.get("ticketId"));
  const file = form.get("file");
  if (!ticketId.success || !(file instanceof File))
    return actionError("VALIDATION", "Elige un archivo para subir.");
  const store = selectFileStore();
  if (!store)
    return actionError(
      "EXTERNAL_UNAVAILABLE",
      "Los adjuntos no están configurados. Pide al administrador que conecte SharePoint.",
    );
  try {
    return await upload(user, ticketId.data, file, store);
  } catch (error) {
    return toActionError(error, "uploadTicketAttachment");
  }
}
