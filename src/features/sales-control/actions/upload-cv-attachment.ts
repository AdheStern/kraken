// src/features/sales-control/actions/upload-cv-attachment.ts
// Adjunta un archivo al CV desde la sección Adjuntos del editor (AGENTS.md §2.1, ADR-16).
"use server";

import { z } from "zod";
import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { selectFileStore } from "@/server/files/select-file-store";
import { uploadCvAttachment as upload } from "@/server/sales-control/upload-cv-attachment";
import { getSessionUser } from "@/server/session";

const schema = z.object({
  cvId: z.uuid(),
  kind: z.enum(["OC_CLIENTE", "OTRO"]),
});

export async function uploadCvAttachment(
  form: FormData,
): Promise<ActionResult<{ attachmentId: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = schema.safeParse({
    cvId: form.get("cvId"),
    kind: form.get("kind"),
  });
  const file = form.get("file");
  if (!parsed.success || !(file instanceof File))
    return actionError("VALIDATION", "Elige un archivo para adjuntar.");
  const store = selectFileStore();
  if (!store)
    return actionError(
      "EXTERNAL_UNAVAILABLE",
      "Los adjuntos no están configurados. Pide al administrador que conecte SharePoint.",
    );
  try {
    return await upload(user, { ...parsed.data, file }, store);
  } catch (error) {
    return toActionError(error, "uploadCvAttachment");
  }
}
