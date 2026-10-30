// src/features/sales-control/line-pricing.test.ts
// Líneas del borrador → precio, totales y resumen; reproduce PRECIO-01 tal como lo carga la grilla.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { priceLine, summarizeLines } from "./line-pricing";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

const FX = { costFxRate: new Decimal("6.97"), saleFxRate: new Decimal("6.96") };

function draft(overrides: Partial<CvLineDraft>): CvLineDraft {
  return {
    key: crypto.randomUUID(),
    id: null,
    kind: "ITEM",
    groupKey: null,
    areaId: "area-net",
    supplierId: null,
    supplyMode: null,
    technologyId: null,
    itemType: null,
    productId: null,
    code: "",
    description: "Equipo",
    unitId: null,
    quantity: "1",
    unitCostUsd: "0",
    pricingSource: "PRECIO",
    factor: "",
    unitSaleUsd: "0",
    poNumber: "",
    notes: "",
    color: null,
    serials: [],
    coverageStart: "",
    coverageEnd: "",
    hourBag: null,
    saveAsProduct: false,
    ...overrides,
  };
}

describe("priceLine", () => {
  it("modo FACTOR calcula la venta y los totales", () => {
    const result = priceLine(
      draft({ unitCostUsd: "337.59", pricingSource: "FACTOR", factor: "2.92" }),
      FX,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.value.pricing.unitSaleUsd.toFixed(2)).toBe("985.76");
    expect(result.value.totals.totalSaleBs.toFixed(2)).toBe("6860.89");
  });

  it("reúne todos los problemas de la línea", () => {
    const result = priceLine(
      draft({
        description: " ",
        areaId: null,
        quantity: "0",
        unitCostUsd: "x",
      }),
      FX,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.field).sort()).toEqual(
      ["areaId", "description", "quantity", "unitCostUsd"].sort(),
    );
  });

  it.each<[Partial<CvLineDraft>, keyof CvLineDraft]>([
    [{ unitCostUsd: "10", pricingSource: "FACTOR", factor: "" }, "factor"],
    [
      { unitCostUsd: "10", pricingSource: "PRECIO", unitSaleUsd: "abc" },
      "unitSaleUsd",
    ],
    [{ unitCostUsd: "0", pricingSource: "FACTOR", factor: "2" }, "unitSaleUsd"],
    [{ unitCostUsd: "10", pricingSource: "FACTOR", factor: "2.555" }, "factor"],
    [{ quantity: "1.005" }, "quantity"],
  ])("señala el campo con problema %j → %s", (overrides, field) => {
    const result = priceLine(draft(overrides), FX);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues.map((issue) => issue.field)).toContain(field);
  });
});

describe("summarizeLines", () => {
  it("PRECIO-01 desde la grilla: factor global 2.92 e ignora notas e inválidas", () => {
    const summary = summarizeLines(
      [
        draft({
          unitCostUsd: "337.59",
          pricingSource: "FACTOR",
          factor: "2.92",
        }),
        draft({
          unitCostUsd: "45.22",
          unitSaleUsd: "130.80",
          areaId: "area-tel",
        }),
        draft({ unitCostUsd: "0.00", unitSaleUsd: "269.12" }),
        draft({
          kind: "NOTA",
          description: "Initial Term - 36 Months",
          areaId: null,
        }),
        draft({ quantity: "" }),
      ],
      FX,
    );
    expect(summary.totals.factor?.toFixed(2)).toBe("2.92");
    expect(summary.totals.totalSaleUsd.toFixed(2)).toBe("1385.68");
    expect(summary.areaIds.sort()).toEqual(["area-net", "area-tel"]);
    expect(summary.invalidCount).toBe(1);
  });
});
