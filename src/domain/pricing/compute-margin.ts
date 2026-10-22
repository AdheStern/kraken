// src/domain/pricing/compute-margin.ts
// Factor y margen sobre lo que tiene costo: la única definición que comparten el CV y los tableros
// (AGENTS.md §2.2 y §6).
import Decimal from "decimal.js";
import { roundHalfUp2 } from "./money";

export type Margin = {
  factor: Decimal | null;
  marginUsd: Decimal;
  marginPct: Decimal | null;
};

// REGLA: solo entran las líneas con costo > 0; los servicios propios (costo 0) se reportan aparte (§2.2, §6).
export function computeMargin(
  costedSaleUsd: Decimal,
  costedCostUsd: Decimal,
): Margin {
  const marginUsd = costedSaleUsd.minus(costedCostUsd);
  return {
    factor: costedCostUsd.isZero()
      ? null
      : roundHalfUp2(costedSaleUsd.dividedBy(costedCostUsd)),
    marginUsd,
    marginPct: costedSaleUsd.isZero()
      ? null
      : roundHalfUp2(
          marginUsd.dividedBy(costedSaleUsd).times(new Decimal(100)),
        ),
  };
}
