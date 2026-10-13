// src/domain/pricing/totals.test.ts
// Totales por línea y por versión: cantidades decimales, suma de líneas redondeadas y casos sin costo.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { computeLineTotals } from "./compute-line-totals";
import { computeVersionTotals } from "./compute-version-totals";

const d = (value: string) => new Decimal(value);
const FX = { costFxRate: d("6.97"), saleFxRate: d("6.96") };

describe("computeLineTotals", () => {
  it("redondea el total con cantidad decimal y deriva Bs del total redondeado", () => {
    const totals = computeLineTotals(
      { quantity: d("2.50"), unitCostUsd: d("10.33"), unitSaleUsd: d("20.67") },
      FX,
    );
    expect(totals.totalCostUsd.toFixed(2)).toBe("25.83"); // 25.825 → half-up
    expect(totals.totalSaleUsd.toFixed(2)).toBe("51.68"); // 51.675 → half-up
    expect(totals.totalCostBs.toFixed(2)).toBe("180.04"); // 25.83 × 6.97 = 180.0351
    expect(totals.totalSaleBs.toFixed(2)).toBe("359.69"); // 51.68 × 6.96 = 359.6928
  });
});

describe("computeVersionTotals", () => {
  const line = (cost: string, sale: string) =>
    computeLineTotals(
      { quantity: d("1"), unitCostUsd: d(cost), unitSaleUsd: d(sale) },
      FX,
    );

  it("suma las líneas ya redondeadas, no recalcula el total", () => {
    const totals = computeVersionTotals([
      line("0.01", "0.03"),
      line("0.01", "0.03"),
    ]);
    expect(totals.totalSaleUsd.toFixed(2)).toBe("0.06");
    expect(totals.factor?.toFixed(2)).toBe("3.00");
    expect(totals.marginPct?.toFixed(2)).toBe("66.67");
  });

  it("sin líneas con costo: factor y margen % nulos, todo es servicio propio", () => {
    const totals = computeVersionTotals([line("0", "100")]);
    expect(totals.factor).toBeNull();
    expect(totals.marginPct).toBeNull();
    expect(totals.ownServicesSaleUsd.toFixed(2)).toBe("100.00");
  });

  it("una versión vacía suma cero", () => {
    const totals = computeVersionTotals([]);
    expect(totals.totalSaleUsd.toFixed(2)).toBe("0.00");
    expect(totals.factor).toBeNull();
  });
});
