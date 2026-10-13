// src/features/sales-control/components/lines/item-cell-context.ts
// Datos que comparten las celdas de una fila de ítem: la línea, su fila, errores y cómo cambiarla.
import type { PricedLine } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { ColumnKey } from "./grid-columns";

export type ItemCellContext = {
  line: CvLineDraft;
  row: number;
  col: (key: ColumnKey) => number;
  issue: (field: keyof CvLineDraft) => string | undefined;
  priced: PricedLine | null;
  disabled: boolean;
  onChange: (patch: Partial<CvLineDraft>) => void;
};
