// src/features/sales-control/line-pricing.ts
// Precio y totales de las líneas del borrador con el dominio de precios. La misma función calcula la
// vista en vivo de la grilla y lo que guarda el servidor (AGENTS.md §9, DRY de proyección y cierre).
import Decimal from "decimal.js";
import {
  computeLinePricing,
  type LinePricing,
  type PricingInput,
} from "@/domain/pricing/compute-line-pricing";
import {
  computeLineTotals,
  type FxRates,
  type LineTotals,
} from "@/domain/pricing/compute-line-totals";
import {
  computeVersionTotals,
  type VersionTotals,
} from "@/domain/pricing/compute-version-totals";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

export type PricedLine = {
  quantity: Decimal;
  unitCostUsd: Decimal;
  pricing: LinePricing;
  totals: LineTotals;
};
export type LineIssue = { field: keyof CvLineDraft; message: string };
export type PriceLineResult =
  | { ok: true; value: PricedLine }
  | { ok: false; issues: LineIssue[] };
export type LinesSummary = {
  totals: VersionTotals;
  areaIds: string[];
  invalidCount: number;
};

const NUMBER = /^-?\d+(\.\d+)?$/;
const ISSUES = {
  COSTO_INVALIDO: {
    field: "unitCostUsd",
    message: "Costo de 0 o más, con hasta 2 decimales.",
  },
  FACTOR_INVALIDO: {
    field: "factor",
    message: "Factor mayor que 0, con hasta 2 decimales.",
  },
  PRECIO_INVALIDO: {
    field: "unitSaleUsd",
    message: "Precio de 0 o más, con hasta 2 decimales.",
  },
  COSTO_CERO_REQUIERE_PRECIO: {
    field: "unitSaleUsd",
    message: "Con costo 0 ingresa el precio de venta.",
  },
} as const satisfies Record<string, LineIssue>;

export function priceLine(line: CvLineDraft, fx: FxRates): PriceLineResult {
  const issues: LineIssue[] = [];
  if (line.description.trim() === "")
    issues.push({ field: "description", message: "Escribe la descripción." });
  if (!line.areaId)
    issues.push({ field: "areaId", message: "Elige el área de la línea." });
  const quantity = toDecimal(line.quantity);
  if (!quantity?.greaterThan(0) || quantity.decimalPlaces() > 2) {
    issues.push({
      field: "quantity",
      message: "Cantidad mayor que 0, con hasta 2 decimales.",
    });
  }
  const unit = priceUnit(line);
  if (!unit.ok) issues.push(unit.issue);
  if (issues.length > 0 || !quantity || !unit.ok) return { ok: false, issues };

  const totals = computeLineTotals(
    {
      quantity,
      unitCostUsd: unit.unitCostUsd,
      unitSaleUsd: unit.pricing.unitSaleUsd,
    },
    fx,
  );
  return {
    ok: true,
    value: {
      quantity,
      unitCostUsd: unit.unitCostUsd,
      pricing: unit.pricing,
      totals,
    },
  };
}

export function summarizeLines(
  lines: readonly CvLineDraft[],
  fx: FxRates,
): LinesSummary {
  const items = lines.filter((line) => line.kind === "ITEM");
  const valid = items.flatMap((line) => {
    const result = priceLine(line, fx);
    return result.ok ? [result.value.totals] : [];
  });
  const areaIds = [
    ...new Set(items.flatMap((line) => (line.areaId ? [line.areaId] : []))),
  ];
  return {
    totals: computeVersionTotals(valid),
    areaIds,
    invalidCount: items.length - valid.length,
  };
}

type UnitPricing =
  | { ok: true; unitCostUsd: Decimal; pricing: LinePricing }
  | { ok: false; issue: LineIssue };

function priceUnit(line: CvLineDraft): UnitPricing {
  const unitCostUsd = toDecimal(line.unitCostUsd);
  if (!unitCostUsd) return { ok: false, issue: ISSUES.COSTO_INVALIDO };
  const input = toPricingInput(line);
  if (!input) {
    const issue =
      line.pricingSource === "FACTOR"
        ? ISSUES.FACTOR_INVALIDO
        : ISSUES.PRECIO_INVALIDO;
    return { ok: false, issue };
  }
  const result = computeLinePricing(unitCostUsd, input);
  return result.ok
    ? { ok: true, unitCostUsd, pricing: result.value }
    : { ok: false, issue: ISSUES[result.error] };
}

function toPricingInput(line: CvLineDraft): PricingInput | null {
  if (line.pricingSource === "FACTOR") {
    const factor = toDecimal(line.factor);
    return factor ? { source: "FACTOR", factor } : null;
  }
  const unitSaleUsd = toDecimal(line.unitSaleUsd);
  return unitSaleUsd ? { source: "PRECIO", unitSaleUsd } : null;
}

function toDecimal(text: string): Decimal | null {
  const trimmed = text.trim();
  return NUMBER.test(trimmed) ? new Decimal(trimmed) : null;
}
