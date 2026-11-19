// src/components/grid/is-block-paste.ts
// Cuándo un pegado en una grilla tipo planilla se reparte en celdas como en Excel y cuándo se pega como texto.

// POR QUÉ: un bloque con tabuladores o saltos se reparte en celdas como en Excel; un valor suelto se pega normal.
// TRAMPA: en un texto largo (descripción, observaciones) los saltos son parte del texto. Lo copiado de Excel
// termina siempre en un salto de línea: eso o un tabulador lo marcan como bloque, incluso una sola celda, que
// así reemplaza la celda sin arrastrar el salto final.
export function isBlockPaste(text: string, isTextArea: boolean): boolean {
  if (text.includes("\t")) return true;
  if (isTextArea) return /\r?\n$/.test(text) && text.trim() !== "";
  return /\n/.test(text.trimEnd());
}
