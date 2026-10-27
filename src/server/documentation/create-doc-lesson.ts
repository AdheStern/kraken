// src/server/documentation/create-doc-lesson.ts
// Guarda una lección aprendida nueva como .txt en la carpeta de su fase, por la misma vía que un documento
// (AGENTS.md §2.10, ADR-16).
import { toLessonFileName } from "@/domain/documentation/lesson-file-name";
import type { ActionResult } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { FileStore } from "@/server/files/file-store";
import { LESSON_MIME_TYPE, toLessonBytes } from "./lesson-bytes";
import { uploadDocument } from "./upload-document";

type NewLesson = {
  projectId: string;
  phaseId: string;
  title: string;
  markdown: string;
};

export function createDocLesson(
  user: SessionUser,
  { projectId, phaseId, title, markdown }: NewLesson,
  store: FileStore,
): Promise<ActionResult<{ documentId: string; fileName: string }>> {
  const file = new File([toLessonBytes(markdown)], toLessonFileName(title), {
    type: LESSON_MIME_TYPE,
  });
  return uploadDocument(user, { projectId, phaseId }, file, store, { title });
}
