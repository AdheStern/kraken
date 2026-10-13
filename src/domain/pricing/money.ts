// src/domain/pricing/money.ts
// Redondeo normativo de montos y factores: half-up a 2 decimales (AGENTS.md §15.4).
import Decimal from "decimal.js";

const DECIMALS = 2;

// POR QUÉ: el modo de redondeo va explícito en cada llamada; no depende de la configuración global de Decimal.
export function roundHalfUp2(value: Decimal): Decimal {
  return value.toDecimalPlaces(DECIMALS, Decimal.ROUND_HALF_UP);
}

export function hasAtMostTwoDecimals(value: Decimal): boolean {
  return value.decimalPlaces() <= DECIMALS;
}
