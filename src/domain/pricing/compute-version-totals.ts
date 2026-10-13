// src/domain/pricing/compute-version-totals.ts
// Totales de una versión de CV a partir de sus líneas ITEM ya calculadas: sumas, factor global,
// margen y servicios propios por separado (AGENTS.md §2.2 y §15.1).
import Decimal from "decimal.js";
import type { LineTotals } from "./compute-line-totals";
import { roundHalfUp2 } from "./money";

export type VersionTotals = {
  totalCostUsd: Decimal;
  totalSaleUsd: Decimal;
  totalCostBs: Decimal;
  totalSaleBs: Decimal;
  factor: Decimal | null;
  marginUsd: Decimal;
  marginPct: Decimal | null;
  ownServicesSaleUsd: Decimal;
};

const ZERO = new Decimal(0);

// REGLA: los totales son la suma de las líneas ya redondeadas, nunca un recálculo del total (§15.4).
export function computeVersionTotals(
  lines: readonly LineTotals[],
): VersionTotals {
  const costed = lines.filter((line) => line.totalCostUsd.greaterThan(0));
  const ownServices = lines.filter((line) => line.totalCostUsd.isZero());
  const costedCost = sum(costed, "totalCostUsd");
  const costedSale = sum(costed, "totalSaleUsd");
  const marginUsd = costedSale.minus(costedCost);

  return {
    totalCostUsd: sum(lines, "totalCostUsd"),
    totalSaleUsd: sum(lines, "totalSaleUsd"),
    totalCostBs: sum(lines, "totalCostBs"),
    totalSaleBs: sum(lines, "totalSaleBs"),
    // REGLA: el factor del CV solo considera líneas con costo > 0; los servicios propios van aparte (§2.2).
    factor: costedCost.isZero()
      ? null
      : roundHalfUp2(costedSale.dividedBy(costedCost)),
    marginUsd,
    marginPct: costedSale.isZero()
      ? null
      : roundHalfUp2(marginUsd.dividedBy(costedSale).times(100)),
    ownServicesSaleUsd: sum(ownServices, "totalSaleUsd"),
  };
}

function sum(lines: readonly LineTotals[], key: keyof LineTotals): Decimal {
  return lines.reduce((acc, line) => acc.plus(line[key]), ZERO);
}
