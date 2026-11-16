// src/features/sales-control/components/lines/optional-totals.ts
// Totales de GROSS UP y RET DIMA para la tarjeta de totales: solo de las columnas que se ven (marcadas o con datos,
// AGENTS.md §2.1), sumados sobre los ítems.
import { sumAmounts } from "@/domain/pricing/sum-amounts";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import { COLUMNS, type ColumnKey } from "./grid-columns";

const SUMMED = [
  { column: "grossUp", field: "grossUpUsd" },
  { column: "retDima", field: "retDimaUsd" },
] as const;

export type OptionalTotal = { label: string; valueUsd: string };

export function optionalTotals(
  lines: readonly CvLineDraft[],
  shown: ReadonlySet<ColumnKey>,
): OptionalTotal[] {
  const items = lines.filter((line) => line.kind === "ITEM");
  return SUMMED.filter(({ column }) => shown.has(column)).map(
    ({ column, field }) => ({
      label: COLUMNS[column].label,
      valueUsd: sumAmounts(items.map((line) => line[field])).toFixed(2),
    }),
  );
}
