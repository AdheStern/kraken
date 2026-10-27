// src/features/documentation/actions/update-doc-lesson.ts
// Guarda la nueva versión de una lección aprendida en su .txt (AGENTS.md §2.10, ADR-16).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { updateDocLesson as update } from "@/server/documentation/update-doc-lesson";
import { selectFileStore } from "@/server/files/select-file-store";
import { getSessionUser } from "@/server/session";
import {
  type UpdateDocLessonInput,
  updateDocLessonSchema,
} from "../schemas/doc-lesson-schemas";

export async function updateDocLesson(
  input: UpdateDocLessonInput,
): Promise<ActionResult<{ version: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = updateDocLessonSchema.safeParse(input);
  if (!parsed.success)
    return actionError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Revisa la lección.",
    );
  const store = selectFileStore();
  if (!store)
    return actionError(
      "EXTERNAL_UNAVAILABLE",
      "Los documentos no están configurados. Pide al administrador que conecte SharePoint.",
    );
  try {
    return await update(user, parsed.data, store);
  } catch (error) {
    return toActionError(error, "updateDocLesson");
  }
}
