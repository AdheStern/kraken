// src/server/documentation/lesson-bytes.ts
// Contenido del .txt de una lección aprendida: su Markdown en UTF-8 (AGENTS.md §2.10).

export const LESSON_MIME_TYPE = "text/plain";

// POR QUÉ: con la marca BOM el Bloc de notas antiguo y la vista previa de SharePoint leen bien los acentos; al
// leerlo, TextDecoder y Response.text() la descartan.
export function toLessonBytes(markdown: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`﻿${markdown.replace(/\r\n?/g, "\n")}`);
}
