// src/domain/pricing/compute-version-totals.ts
// Totales de una versión de CV a partir de sus líneas ITEM ya calculadas: sumas, factor global,
// margen y servicios propios por separado (AGENTS.md §2.2 y §15.1).
import Decimal from "decimal.js";
import type { LineTotals } from "./compute-line-totals";
import { computeMargin } from "./compute-margin";

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
  return {
    totalCostUsd: sum(lines, "totalCostUsd"),
    totalSaleUsd: sum(lines, "totalSaleUsd"),
    totalCostBs: sum(lines, "totalCostBs"),
    totalSaleBs: sum(lines, "totalSaleBs"),
    ...computeMargin(sum(costed, "totalSaleUsd"), sum(costed, "totalCostUsd")),
    ownServicesSaleUsd: sum(ownServices, "totalSaleUsd"),
  };
}

function sum(lines: readonly LineTotals[], key: keyof LineTotals): Decimal {
  return lines.reduce((acc, line) => acc.plus(line[key]), ZERO);
}
