// tests/canon/precio-01.test.ts
// Caso canónico PRECIO-01 (AGENTS.md §15.1): factor, precio final, Bs y factor global.
// REGLA: no se edita sin cambiar antes la sección 15 de AGENTS.md (regla 13).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  computeLinePricing,
  type PricingInput,
} from "@/domain/pricing/compute-line-pricing";
import { computeLineTotals } from "@/domain/pricing/compute-line-totals";
import { computeVersionTotals } from "@/domain/pricing/compute-version-totals";

const d = (value: string) => new Decimal(value);
const FX = { costFxRate: d("6.97"), saleFxRate: d("6.96") };
const QUANTITY = d("1");

function price(unitCostUsd: string, input: PricingInput) {
  const result = computeLinePricing(d(unitCostUsd), input);
  if (!result.ok) throw new Error(result.error);
  const pricing = result.value;
  const totals = computeLineTotals(
    {
      quantity: QUANTITY,
      unitCostUsd: d(unitCostUsd),
      unitSaleUsd: pricing.unitSaleUsd,
    },
    FX,
  );
  return { pricing, totals };
}

const l1 = price("337.59", { source: "FACTOR", factor: d("2.92") });
const l2 = price("45.22", { source: "PRECIO", unitSaleUsd: d("130.80") });
const l3 = price("0.00", { source: "PRECIO", unitSaleUsd: d("269.12") });

describe("PRECIO-01", () => {
  it("L1 (FACTOR): 337.59 × 2.92 = 985.76; Bs 6,860.89 y 2,353.00", () => {
    expect(l1.pricing.pricingSource).toBe("FACTOR");
    expect(l1.pricing.unitSaleUsd.toFixed(2)).toBe("985.76");
    expect(l1.pricing.factor?.toFixed(2)).toBe("2.92");
    expect(l1.totals.unitSaleBs.toFixed(2)).toBe("6860.89");
    expect(l1.totals.unitCostBs.toFixed(2)).toBe("2353.00");
  });

  it("L2 (PRECIO): guarda 130.80; el factor 2.89 es aproximado; Bs 910.37 y 315.18", () => {
    expect(l2.pricing.pricingSource).toBe("PRECIO");
    expect(l2.pricing.unitSaleUsd.toFixed(2)).toBe("130.80");
    expect(l2.pricing.factor?.toFixed(2)).toBe("2.89");
    expect(l2.pricing.isFactorApproximate).toBe(true);
    expect(l2.totals.unitSaleBs.toFixed(2)).toBe("910.37");
    expect(l2.totals.unitCostBs.toFixed(2)).toBe("315.18");
  });

  it("L3 (servicio propio): costo 0, factor null; Bs 1,873.08 y 0.00", () => {
    expect(l3.pricing.factor).toBeNull();
    expect(l3.pricing.unitSaleUsd.toFixed(2)).toBe("269.12");
    expect(l3.totals.unitSaleBs.toFixed(2)).toBe("1873.08");
    expect(l3.totals.unitCostBs.toFixed(2)).toBe("0.00");
  });

  it("factor global (L1 + L2) = 1,116.56 / 382.81 = 2.92; L3 no participa", () => {
    const totals = computeVersionTotals([l1.totals, l2.totals, l3.totals]);
    expect(totals.factor?.toFixed(2)).toBe("2.92");
    expect(totals.totalCostUsd.toFixed(2)).toBe("382.81");
    expect(totals.totalSaleUsd.toFixed(2)).toBe("1385.68");
    expect(totals.ownServicesSaleUsd.toFixed(2)).toBe("269.12");
    expect(totals.marginUsd.toFixed(2)).toBe("733.75");
  });
});
