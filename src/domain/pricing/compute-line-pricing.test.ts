// src/domain/pricing/compute-line-pricing.test.ts
// Casos borde de factor ↔ precio: redondeo half-up, costo 0 y validaciones (AGENTS.md §2.2, §15.4).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { computeLinePricing } from "./compute-line-pricing";

const d = (value: string) => new Decimal(value);

describe("computeLinePricing", () => {
  it("redondea half-up la venta en modo FACTOR (0.005 sube)", () => {
    const result = computeLinePricing(d("0.50"), {
      source: "FACTOR",
      factor: d("1.01"),
    });
    expect(result.ok && result.value.unitSaleUsd.toFixed(2)).toBe("0.51");
  });

  it("en modo PRECIO con factor exacto no marca aproximado", () => {
    const result = computeLinePricing(d("100.00"), {
      source: "PRECIO",
      unitSaleUsd: d("250.00"),
    });
    expect(result.ok && result.value.factor?.toFixed(2)).toBe("2.50");
    expect(result.ok && result.value.isFactorApproximate).toBe(false);
  });

  it("redondea half-up el factor en modo PRECIO", () => {
    const result = computeLinePricing(d("8.00"), {
      source: "PRECIO",
      unitSaleUsd: d("9.00"),
    });
    expect(result.ok && result.value.factor?.toFixed(2)).toBe("1.13");
  });

  it("rechaza el modo FACTOR con costo 0", () => {
    const result = computeLinePricing(d("0"), {
      source: "FACTOR",
      factor: d("2"),
    });
    expect(result).toEqual({ ok: false, error: "COSTO_CERO_REQUIERE_PRECIO" });
  });

  it.each([["0"], ["-1"], ["1.234"]])("rechaza el factor %s", (factor) => {
    const result = computeLinePricing(d("10"), {
      source: "FACTOR",
      factor: d(factor),
    });
    expect(result).toEqual({ ok: false, error: "FACTOR_INVALIDO" });
  });

  it.each([["-0.01"], ["1.005"]])("rechaza el costo %s", (cost) => {
    const result = computeLinePricing(d(cost), {
      source: "FACTOR",
      factor: d("2"),
    });
    expect(result).toEqual({ ok: false, error: "COSTO_INVALIDO" });
  });

  it.each([["-5"], ["10.001"]])("rechaza el precio %s", (price) => {
    const result = computeLinePricing(d("10"), {
      source: "PRECIO",
      unitSaleUsd: d(price),
    });
    expect(result).toEqual({ ok: false, error: "PRECIO_INVALIDO" });
  });

  it("acepta precio 0 con costo 0 (línea sin cargo)", () => {
    const result = computeLinePricing(d("0"), {
      source: "PRECIO",
      unitSaleUsd: d("0"),
    });
    expect(result.ok && result.value.factor).toBeNull();
  });
});
