// src/domain/pricing/compute-line-totals.ts
// Montos de una línea en USD y en Bs, redondeados por línea (AGENTS.md §2.2 y §15.4).
import type Decimal from "decimal.js";
import { roundHalfUp2 } from "./money";

export type LineAmounts = {
  quantity: Decimal;
  unitCostUsd: Decimal;
  unitSaleUsd: Decimal;
};

export type FxRates = {
  costFxRate: Decimal;
  saleFxRate: Decimal;
};

export type LineTotals = {
  totalCostUsd: Decimal;
  totalSaleUsd: Decimal;
  unitCostBs: Decimal;
  unitSaleBs: Decimal;
  totalCostBs: Decimal;
  totalSaleBs: Decimal;
};

// REGLA: los bolivianos son siempre derivados; costo con TC de costo y venta con TC de venta (§2.2).
export function computeLineTotals(line: LineAmounts, fx: FxRates): LineTotals {
  const totalCostUsd = roundHalfUp2(line.quantity.times(line.unitCostUsd));
  const totalSaleUsd = roundHalfUp2(line.quantity.times(line.unitSaleUsd));
  return {
    totalCostUsd,
    totalSaleUsd,
    unitCostBs: roundHalfUp2(line.unitCostUsd.times(fx.costFxRate)),
    unitSaleBs: roundHalfUp2(line.unitSaleUsd.times(fx.saleFxRate)),
    totalCostBs: roundHalfUp2(totalCostUsd.times(fx.costFxRate)),
    totalSaleBs: roundHalfUp2(totalSaleUsd.times(fx.saleFxRate)),
  };
}
