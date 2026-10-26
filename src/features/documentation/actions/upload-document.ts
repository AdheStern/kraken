// src/features/documentation/actions/upload-document.ts
// Sube un documento a una fase de un proyecto de documentación (AGENTS.md §2.10, ADR-16).
"use server";

import { z } from "zod";
import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { uploadDocument as upload } from "@/server/documentation/upload-document";
import { selectFileStore } from "@/server/files/select-file-store";
import { getSessionUser } from "@/server/session";

const targetSchema = z.object({ projectId: z.uuid(), phaseId: z.uuid() });

export async function uploadDocument(
  form: FormData,
): Promise<ActionResult<{ documentId: string; fileName: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const target = targetSchema.safeParse({
    projectId: form.get("projectId"),
    phaseId: form.get("phaseId"),
  });
  const file = form.get("file");
  if (!target.success || !(file instanceof File))
    return actionError("VALIDATION", "Elige un archivo para subir.");
  const store = selectFileStore();
  if (!store)
    return actionError(
      "EXTERNAL_UNAVAILABLE",
      "Los documentos no están configurados. Pide al administrador que conecte SharePoint.",
    );
  try {
    return await upload(user, target.data, file, store);
  } catch (error) {
    return toActionError(error, "uploadDocument");
  }
}
