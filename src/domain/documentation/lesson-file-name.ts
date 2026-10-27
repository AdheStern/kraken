// src/domain/documentation/lesson-file-name.ts
// Nombre del .txt de una lección aprendida dentro de la carpeta de su fase (AGENTS.md §2.10).

const LESSON_PREFIX = "Lección aprendida - ";

// REGLA: el prefijo la distingue de los documentos subidos al navegar la biblioteca de SharePoint; el título se
// compacta a una línea porque es parte del nombre del archivo.
export function toLessonFileName(title: string): string {
  return `${LESSON_PREFIX}${title.replace(/\s+/g, " ").trim()}.txt`;
}
