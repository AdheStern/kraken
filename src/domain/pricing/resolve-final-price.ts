// src/domain/pricing/resolve-final-price.ts
// Total que se presenta de una versión de CV: el calculado por sus líneas o el precio final que fijaron
// Administración o el GG, en USD y/o Bs, con la diferencia frente al calculado (AGENTS.md §2.3, decisión 2026-11-19).
import Decimal from "decimal.js";
import { roundHalfUp2 } from "./money";

export type FinalPriceInput = {
  computedSaleUsd: Decimal;
  computedSaleBs: Decimal;
  finalSaleUsd: Decimal | null;
  finalSaleBs: Decimal | null;
  saleFxRate: Decimal;
};

export type ResolvedFinalPrice = {
  saleUsd: Decimal;
  saleBs: Decimal;
  isOverridden: boolean;
  diffUsd: Decimal;
  diffBs: Decimal;
  /** % sobre el calculado en USD, o en Bs si solo se fijó Bs; null si el calculado es 0. */
  diffPct: Decimal | null;
};

// REGLA: el precio final no toca las líneas; con solo USD los Bs se derivan con el TC de venta, con solo Bs el USD
// queda el calculado (decisión 2026-11-19).
export function resolveFinalPrice(input: FinalPriceInput): ResolvedFinalPrice {
  const { computedSaleUsd, computedSaleBs, finalSaleUsd, finalSaleBs } = input;
  const saleUsd = finalSaleUsd ?? computedSaleUsd;
  const saleBs =
    finalSaleBs ??
    (finalSaleUsd
      ? roundHalfUp2(finalSaleUsd.times(input.saleFxRate))
      : computedSaleBs);
  const diffUsd = saleUsd.minus(computedSaleUsd);
  const diffBs = saleBs.minus(computedSaleBs);
  const onlyBs = finalSaleUsd === null && finalSaleBs !== null;
  return {
    saleUsd,
    saleBs,
    isOverridden: finalSaleUsd !== null || finalSaleBs !== null,
    diffUsd,
    diffBs,
    diffPct: onlyBs
      ? percentOf(diffBs, computedSaleBs)
      : percentOf(diffUsd, computedSaleUsd),
  };
}

// [CONFIRMAR] el % que dispara el aviso llega como parámetro (`cv.precio_final_desvio_max_pct`); avisa, no bloquea.
export function isFinalPriceDeviating(
  diffPct: Decimal | null,
  maxDeviationPct: Decimal,
): boolean {
  return diffPct?.abs().greaterThan(maxDeviationPct) ?? false;
}

function percentOf(diff: Decimal, base: Decimal): Decimal | null {
  if (base.isZero()) return null;
  return roundHalfUp2(diff.dividedBy(base).times(new Decimal(100)));
}
