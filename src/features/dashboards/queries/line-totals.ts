// src/features/dashboards/queries/line-totals.ts
// Montos de una línea de CV leída de la base, con el dominio de precios (AGENTS.md §2.2, §15.4): la misma
// definición que el editor y la exportación.
import Decimal from "decimal.js";
import {
  computeLineTotals,
  type LineTotals,
} from "@/domain/pricing/compute-line-totals";

type Stored = { toString(): string } | null;

export const LINE_AMOUNTS_SELECT = {
  quantity: true,
  unitCostUsd: true,
  unitSaleUsd: true,
} as const;

export const VERSION_FX_SELECT = {
  costFxRate: true,
  saleFxRate: true,
} as const;

export function lineTotalsOf(
  line: { quantity: Stored; unitCostUsd: Stored; unitSaleUsd: Stored },
  version: { costFxRate: Stored; saleFxRate: Stored },
): LineTotals {
  return computeLineTotals(
    {
      quantity: dec(line.quantity),
      unitCostUsd: dec(line.unitCostUsd),
      unitSaleUsd: dec(line.unitSaleUsd),
    },
    {
      costFxRate: dec(version.costFxRate),
      saleFxRate: dec(version.saleFxRate),
    },
  );
}

export function dec(value: Stored): Decimal {
  return new Decimal(value?.toString() ?? 0);
}
