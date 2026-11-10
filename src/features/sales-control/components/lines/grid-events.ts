// src/features/sales-control/components/lines/grid-events.ts
// Eventos de la grilla del CV que no son de una celda: pegar un bloque desde Excel y escribir un código de producto.
import type { ClipboardEvent, Dispatch } from "react";
import { parseTsv } from "@/domain/sales-control/parse-tsv";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { ProductOption } from "../../types";
import type { ColumnKey } from "./grid-columns";
import type { LinesAction } from "./use-cv-lines-state";

export function blockPaste(
  event: ClipboardEvent<HTMLDivElement>,
  lines: CvLineDraft[],
  columns: ColumnKey[],
): {
  target: { lineKey: string; column: ColumnKey };
  matrix: string[][];
} | null {
  const element = event.target as HTMLElement;
  const cell = element.dataset.cell;
  const text = event.clipboardData.getData("text/plain");
  if (!cell || !isBlockPaste(text, element instanceof HTMLTextAreaElement))
    return null;
  const [row, col] = cell.split(":").map(Number);
  const line = lines[row];
  const column = columns[col];
  if (!line || !column) return null;
  return { target: { lineKey: line.key, column }, matrix: parseTsv(text) };
}

// POR QUÉ: un bloque con tabuladores o saltos se reparte en celdas como en Excel; un valor suelto se pega normal.
// TRAMPA: en un texto largo (descripción, observaciones) los saltos son parte del texto. Lo copiado de Excel
// termina siempre en un salto de línea: eso o un tabulador lo marcan como bloque, incluso una sola celda, que
// así reemplaza la celda sin arrastrar el salto final.
export function isBlockPaste(text: string, isTextArea: boolean): boolean {
  if (text.includes("\t")) return true;
  if (isTextArea) return /\r?\n$/.test(text) && text.trim() !== "";
  return /\n/.test(text.trimEnd());
}

export function typeProductCode(
  dispatch: Dispatch<LinesAction>,
  productsByCode: Map<string, ProductOption>,
  key: string,
  code: string,
) {
  dispatch({ type: "updateLine", key, patch: { code, productId: null } });
  const product = productsByCode.get(code.trim().toUpperCase());
  if (product) dispatch({ type: "applyProduct", key, product });
}
