// src/features/sales-control/components/lines/item-cell-context.ts
// Datos que comparten las celdas de una fila de ítem: la línea, su fila, errores y cómo cambiarla.
import type { PricedLine } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { ColumnKey } from "./grid-columns";

/** Qué se edita fuera del borrador: datos posventa de la versión aprobada, GROSS UP / RET DIMA y activación (§2.3). */
export type LineEditRights = {
  canEditPostSale: boolean;
  canEditWithholdings: boolean;
  canEditActivation: boolean;
};

export function hasAfterDraftRights(rights: LineEditRights): boolean {
  return (
    rights.canEditPostSale ||
    rights.canEditWithholdings ||
    rights.canEditActivation
  );
}

export type ItemCellContext = {
  line: CvLineDraft;
  row: number;
  col: (key: ColumnKey) => number;
  issue: (field: keyof CvLineDraft) => string | undefined;
  priced: PricedLine | null;
  disabled: boolean;
  // Observaciones, PO#, BC y seriales: siguen editables en la versión aprobada (AGENTS.md §2.3).
  postSaleDisabled: boolean;
  // GROSS UP y RET DIMA: los corrigen Administración y las gerencias en cualquier estado (AGENTS.md §2.3).
  withholdingsDisabled: boolean;
  // Rango de activación: se completa en cualquier estado del CV salvo anulado (AGENTS.md §2.3).
  activationDisabled: boolean;
  // Costo promedio del inventario para una línea «Stock DIMA» con producto; null si no aplica (§2.1).
  stockCostUsd: string | null;
  onChange: (patch: Partial<CvLineDraft>) => void;
};
