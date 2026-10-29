// src/features/documentation/components/phase-count-text.ts
// Cuánto guarda una fase, en texto: documentos y, si hay, lecciones aprendidas.
import type { DocPhaseView } from "../types";

export function phaseCountText(phase: DocPhaseView): string {
  const docs =
    phase.documents.length === 1
      ? "1 documento"
      : `${phase.documents.length} documentos`;
  const lessons = phase.lessons.length;
  if (lessons === 0) return docs;
  return `${docs} · ${lessons === 1 ? "1 lección" : `${lessons} lecciones`}`;
}
