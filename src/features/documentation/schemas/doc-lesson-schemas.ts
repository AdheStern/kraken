// src/features/documentation/schemas/doc-lesson-schemas.ts
// Entradas de las lecciones aprendidas de una fase (AGENTS.md §2.10); el mismo zod valida el diálogo y la action.
import { z } from "zod";

// POR QUÉ: una lección es texto; el tope la mantiene muy por debajo de los 20 MB y de la subida simple de Graph.
const MAX_LESSON_CHARS = 100_000;

const markdown = z
  .string()
  .trim()
  .min(1, "Escribe la lección antes de guardarla.")
  .max(MAX_LESSON_CHARS, "La lección es demasiado larga; divídela en dos.");

export const createDocLessonSchema = z.object({
  projectId: z.uuid(),
  phaseId: z.uuid(),
  title: z
    .string()
    .trim()
    .min(3, "Escribe un título de al menos 3 letras.")
    .max(120, "Acorta el título a 120 caracteres."),
  markdown,
});

export type CreateDocLessonInput = z.input<typeof createDocLessonSchema>;

// POR QUÉ: cualquiera con rol edita (§2.10); la versión que se abrió evita pisar la edición de otra persona.
export const updateDocLessonSchema = z.object({
  documentId: z.uuid(),
  baseVersion: z.string().length(64),
  markdown,
});

export type UpdateDocLessonInput = z.input<typeof updateDocLessonSchema>;
