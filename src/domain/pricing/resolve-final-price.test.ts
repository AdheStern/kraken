// src/domain/pricing/resolve-final-price.test.ts
// Precio final de una versión de CV (decisión 2026-11-19): USD y/o Bs, Bs derivado con el TC de venta y aviso de
// desvío sin bloquear. Usa los totales de PRECIO-01 (§15.1).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  isFinalPriceDeviating,
  resolveFinalPrice,
} from "./resolve-final-price";

const d = (value: string) => new Decimal(value);
// PRECIO-01: L1 + L2 + L3 = 985.76 + 130.80 + 269.12; Bs 6,860.89 + 910.37 + 1,873.08.
const base = {
  computedSaleUsd: d("1385.68"),
  computedSaleBs: d("9644.34"),
  saleFxRate: d("6.96"),
};

describe("resolveFinalPrice", () => {
  it("sin precio final presenta lo calculado", () => {
    const r = resolveFinalPrice({
      ...base,
      finalSaleUsd: null,
      finalSaleBs: null,
    });
    expect(r.isOverridden).toBe(false);
    expect(r.saleUsd.toFixed(2)).toBe("1385.68");
    expect(r.saleBs.toFixed(2)).toBe("9644.34");
    expect(r.diffUsd.isZero()).toBe(true);
    expect(r.diffPct?.toFixed(2)).toBe("0.00");
  });

  it("con solo USD deriva los Bs con el TC de venta, half-up", () => {
    const r = resolveFinalPrice({
      ...base,
      finalSaleUsd: d("1400.00"),
      finalSaleBs: null,
    });
    expect(r.saleUsd.toFixed(2)).toBe("1400.00");
    expect(r.saleBs.toFixed(2)).toBe("9744.00");
    expect(r.diffUsd.toFixed(2)).toBe("14.32");
    expect(r.diffBs.toFixed(2)).toBe("99.66");
    expect(r.diffPct?.toFixed(2)).toBe("1.03");
  });

  it("con solo Bs deja el USD calculado y mide el % en Bs", () => {
    const r = resolveFinalPrice({
      ...base,
      finalSaleUsd: null,
      finalSaleBs: d("9600.00"),
    });
    expect(r.isOverridden).toBe(true);
    expect(r.saleUsd.toFixed(2)).toBe("1385.68");
    expect(r.diffUsd.isZero()).toBe(true);
    expect(r.diffBs.toFixed(2)).toBe("-44.34");
    expect(r.diffPct?.toFixed(2)).toBe("-0.46");
  });

  it("con USD y Bs usa los dos tal cual", () => {
    const r = resolveFinalPrice({
      ...base,
      finalSaleUsd: d("1390.00"),
      finalSaleBs: d("9650.00"),
    });
    expect(r.saleBs.toFixed(2)).toBe("9650.00");
    expect(r.diffPct?.toFixed(2)).toBe("0.31");
  });

  it("sin total calculado no hay %", () => {
    const r = resolveFinalPrice({
      computedSaleUsd: d("0"),
      computedSaleBs: d("0"),
      saleFxRate: d("6.96"),
      finalSaleUsd: d("10"),
      finalSaleBs: null,
    });
    expect(r.diffPct).toBeNull();
  });
});

describe("isFinalPriceDeviating", () => {
  it.each<[string | null, boolean]>([
    ["5.00", false],
    ["5.01", true],
    ["-7.20", true],
    [null, false],
  ])("%s %% frente a 5 %% → %s", (pct, expected) => {
    expect(isFinalPriceDeviating(pct ? d(pct) : null, d("5"))).toBe(expected);
  });
});
