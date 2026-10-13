// src/domain/pricing/compute-line-pricing.ts
// Precio unitario de venta y factor de una línea según cómo se fijó el precio (FACTOR o PRECIO).
// Regla normativa: AGENTS.md §2.2 y caso PRECIO-01.
import type Decimal from "decimal.js";
import { hasAtMostTwoDecimals, roundHalfUp2 } from "./money";

export type PricingInput =
  | { source: "FACTOR"; factor: Decimal }
  | { source: "PRECIO"; unitSaleUsd: Decimal };

export type LinePricing = {
  pricingSource: "FACTOR" | "PRECIO";
  unitSaleUsd: Decimal;
  factor: Decimal | null;
  isFactorApproximate: boolean;
};

export type PricingError =
  | "COSTO_INVALIDO"
  | "FACTOR_INVALIDO"
  | "PRECIO_INVALIDO"
  | "COSTO_CERO_REQUIERE_PRECIO";

export type PricingResult =
  | { ok: true; value: LinePricing }
  | { ok: false; error: PricingError };

export function computeLinePricing(
  unitCostUsd: Decimal,
  input: PricingInput,
): PricingResult {
  if (unitCostUsd.isNegative() || !hasAtMostTwoDecimals(unitCostUsd)) {
    return { ok: false, error: "COSTO_INVALIDO" };
  }
  return input.source === "FACTOR"
    ? fromFactor(unitCostUsd, input.factor)
    : fromPrice(unitCostUsd, input.unitSaleUsd);
}

function fromFactor(unitCostUsd: Decimal, factor: Decimal): PricingResult {
  // REGLA: con costo 0 solo existe el modo PRECIO; el factor no tiene sentido (§2.2).
  if (unitCostUsd.isZero()) {
    return { ok: false, error: "COSTO_CERO_REQUIERE_PRECIO" };
  }
  if (!factor.greaterThan(0) || !hasAtMostTwoDecimals(factor)) {
    return { ok: false, error: "FACTOR_INVALIDO" };
  }
  return {
    ok: true,
    value: {
      pricingSource: "FACTOR",
      unitSaleUsd: roundHalfUp2(unitCostUsd.times(factor)),
      factor,
      isFactorApproximate: false,
    },
  };
}

function fromPrice(unitCostUsd: Decimal, unitSaleUsd: Decimal): PricingResult {
  if (unitSaleUsd.isNegative() || !hasAtMostTwoDecimals(unitSaleUsd)) {
    return { ok: false, error: "PRECIO_INVALIDO" };
  }
  if (unitCostUsd.isZero()) {
    const value = {
      pricingSource: "PRECIO",
      unitSaleUsd,
      factor: null,
      isFactorApproximate: false,
    } as const;
    return { ok: true, value };
  }
  // POR QUÉ: en modo PRECIO se guarda el precio ingresado; el factor redondeado puede no reproducirlo (PRECIO-01 L2).
  const factor = roundHalfUp2(unitSaleUsd.dividedBy(unitCostUsd));
  const reproduced = roundHalfUp2(unitCostUsd.times(factor));
  return {
    ok: true,
    value: {
      pricingSource: "PRECIO",
      unitSaleUsd,
      factor,
      isFactorApproximate: !reproduced.equals(unitSaleUsd),
    },
  };
}
