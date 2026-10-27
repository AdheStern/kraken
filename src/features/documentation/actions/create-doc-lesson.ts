// src/features/documentation/actions/create-doc-lesson.ts
// Guarda una lección aprendida nueva como .txt en la carpeta de su fase (AGENTS.md §2.10, ADR-16).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { createDocLesson as create } from "@/server/documentation/create-doc-lesson";
import { selectFileStore } from "@/server/files/select-file-store";
import { getSessionUser } from "@/server/session";
import {
  type CreateDocLessonInput,
  createDocLessonSchema,
} from "../schemas/doc-lesson-schemas";

export async function createDocLesson(
  input: CreateDocLessonInput,
): Promise<ActionResult<{ documentId: string; fileName: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = createDocLessonSchema.safeParse(input);
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
    return await create(user, parsed.data, store);
  } catch (error) {
    return toActionError(error, "createDocLesson");
  }
}
