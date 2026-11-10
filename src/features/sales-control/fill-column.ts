// src/features/sales-control/fill-column.ts
// «Aplicar a todas»: pone el mismo valor de una columna desplegable en los ítems del CV o de un lote, en todos o
// solo en los que la tienen vacía. Las notas no tienen esas columnas y quedan igual.
import {
  SELECT_COLUMNS,
  type SelectColumnKey,
} from "./components/lines/select-columns";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

export type FillScope = {
  /** undefined = todo el CV; null = las líneas sin lote; texto = ese lote. */
  groupKey?: string | null;
  onlyEmpty: boolean;
};

export function fillColumn(
  lines: CvLineDraft[],
  column: SelectColumnKey,
  value: string,
  { groupKey, onlyEmpty }: FillScope,
): { lines: CvLineDraft[]; touched: number } {
  const { field, patch } = SELECT_COLUMNS[column];
  let touched = 0;
  const next = lines.map((line) => {
    if (line.kind !== "ITEM") return line;
    if (groupKey !== undefined && line.groupKey !== groupKey) return line;
    if (onlyEmpty && line[field] !== null) return line;
    if (line[field] === value) return line;
    touched += 1;
    return { ...line, ...patch(value) };
  });
  return { lines: next, touched };
}
