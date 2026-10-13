// src/domain/pricing/apply-factor.test.ts
// Factor aplicado a un grupo o tecnología ("FACTOR CISCO") y advertencia de desvío del TC.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { applyFactor } from "./apply-factor";
import { computeLinePricing, type LinePricing } from "./compute-line-pricing";
import { isFxRateDeviating } from "./fx-deviation";

const d = (value: string) => new Decimal(value);

function line(cost: string, technology: string) {
  const result = computeLinePricing(d(cost), {
    source: "PRECIO",
    unitSaleUsd: d("100"),
  });
  if (!result.ok) throw new Error(result.error);
  return {
    unitCostUsd: d(cost),
    technology,
    pricing: result.value as LinePricing,
  };
}

describe("applyFactor", () => {
  const lines = [line("50", "CISCO"), line("40", "HUAWEI"), line("0", "CISCO")];

  it("aplica el factor solo a las líneas filtradas y salta las de costo 0", () => {
    const result = applyFactor(
      lines,
      d("2.50"),
      (l) => l.technology === "CISCO",
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.lines[0].pricing.pricingSource).toBe("FACTOR");
    expect(result.lines[0].pricing.unitSaleUsd.toFixed(2)).toBe("125.00");
    expect(result.lines[1]).toBe(lines[1]);
    expect(result.lines[2]).toBe(lines[2]);
    expect(result.skippedZeroCost).toBe(1);
  });

  it("rechaza un factor con más de 2 decimales", () => {
    const result = applyFactor(lines, d("2.555"), () => true);
    expect(result).toEqual({ ok: false, error: "FACTOR_INVALIDO" });
  });
});

describe("isFxRateDeviating", () => {
  it("advierte solo por encima del % permitido", () => {
    expect(isFxRateDeviating(d("6.97"), d("6.96"), d("2"))).toBe(false);
    expect(isFxRateDeviating(d("7.20"), d("6.96"), d("2"))).toBe(true);
  });

  it("sin TC oficial no advierte", () => {
    expect(isFxRateDeviating(d("6.97"), null, d("2"))).toBe(false);
  });
});
