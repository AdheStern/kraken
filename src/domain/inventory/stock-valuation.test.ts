// src/domain/inventory/stock-valuation.test.ts
// Costo promedio ponderado como valor total (AGENTS.md §2.8 [CONFIRMAR], §15.4): entradas, salidas al promedio,
// la última salida se lleva el resto y las porciones suman el total.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  applyInbound,
  applyOutbound,
  averageUnitCostUsd,
  proportionalValue,
  type StockBalance,
  valueAtAverage,
} from "./stock-valuation";

const d = (value: string | number) => new Decimal(value);
const empty: StockBalance = { quantity: d(0), valueUsd: d(0) };
const asText = (balance: StockBalance) => ({
  quantity: balance.quantity.toFixed(2),
  valueUsd: balance.valueUsd.toFixed(2),
});

describe("applyInbound", () => {
  it("suma cantidad y valor y el promedio se deriva", () => {
    const first = applyInbound(empty, d(3), d("300"));
    const second = applyInbound(first.balance, d(1), d("120"));
    expect(asText(second.balance)).toEqual({
      quantity: "4.00",
      valueUsd: "420.00",
    });
    expect(averageUnitCostUsd(second.balance)?.toFixed(2)).toBe("105.00");
  });

  it("rechaza cantidades no positivas, con más de 2 decimales o valor negativo", () => {
    expect(() => applyInbound(empty, d(0), d(1))).toThrow(RangeError);
    expect(() => applyInbound(empty, d("1.005"), d(1))).toThrow(RangeError);
    expect(() => applyInbound(empty, d(1), d(-1))).toThrow(RangeError);
    expect(() => applyInbound(empty, d(1), d("1.001"))).toThrow(RangeError);
  });
});

describe("applyOutbound", () => {
  it("sale al promedio con half-up y la última unidad se lleva el resto", () => {
    const stock = { quantity: d(3), valueUsd: d("100.00") };
    const first = applyOutbound(stock, d(1));
    expect(first.valueUsd.toFixed(2)).toBe("-33.33");
    expect(first.quantity.toFixed(2)).toBe("-1.00");
    const second = applyOutbound(first.balance, d(1));
    expect(second.valueUsd.toFixed(2)).toBe("-33.34");
    const last = applyOutbound(second.balance, d(1));
    expect(last.valueUsd.toFixed(2)).toBe("-33.33");
    expect(asText(last.balance)).toEqual({
      quantity: "0.00",
      valueUsd: "0.00",
    });
  });

  it("no sale más que el stock", () => {
    expect(() =>
      applyOutbound({ quantity: d(1), valueUsd: d(5) }, d(2)),
    ).toThrow("La salida supera el stock.");
  });

  it("un valor muy chico puede dejar stock con valor 0, nunca valor sin stock", () => {
    const tiny = applyOutbound({ quantity: d(3), valueUsd: d("0.01") }, d(2));
    expect(tiny.valueUsd.toFixed(2)).toBe("-0.01");
    expect(asText(tiny.balance)).toEqual({
      quantity: "1.00",
      valueUsd: "0.00",
    });
  });
});

describe("valueAtAverage y averageUnitCostUsd", () => {
  it("valorizan al promedio vigente; sin stock no hay promedio", () => {
    expect(
      valueAtAverage({ quantity: d(3), valueUsd: d(100) }, d(2)).toFixed(2),
    ).toBe("66.67");
    expect(() => valueAtAverage(empty, d(1))).toThrow(RangeError);
    expect(averageUnitCostUsd(empty)).toBeNull();
  });
});

describe("proportionalValue", () => {
  it("reparte el valor enviado en porciones que suman exactamente el total", () => {
    const portions = [d(1), d(1), d(1)].map((q, i) =>
      proportionalValue(d(100), d(3), q, d(i)),
    );
    expect(portions.map((p) => p.toFixed(2))).toEqual([
      "33.33",
      "33.34",
      "33.33",
    ]);
    expect(portions.reduce((a, b) => a.plus(b)).toFixed(2)).toBe("100.00");
  });

  it("no toma más que la cantidad original", () => {
    expect(() => proportionalValue(d(100), d(3), d(2), d(2))).toThrow(
      RangeError,
    );
    expect(() => proportionalValue(d(100), d(3), d(1), d(-1))).toThrow(
      RangeError,
    );
  });
});
