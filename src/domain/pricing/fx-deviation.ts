// src/domain/pricing/fx-deviation.ts
// Advertencia (sin bloquear) cuando un TC ingresado a mano se aleja del TC oficial del BCB (AGENTS.md §2.2).
import type Decimal from "decimal.js";

// [CONFIRMAR] el % máximo de desvío llega como parámetro (`fx.desvio_max_pct`); no se fija aquí.
export function isFxRateDeviating(
  entered: Decimal,
  official: Decimal | null,
  maxDeviationPct: Decimal,
): boolean {
  if (!official || official.isZero()) return false;
  const deviationPct = entered
    .minus(official)
    .abs()
    .dividedBy(official)
    .times(100);
  return deviationPct.greaterThan(maxDeviationPct);
}
