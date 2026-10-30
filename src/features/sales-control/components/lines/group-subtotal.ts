// src/features/sales-control/components/lines/group-subtotal.ts
// Subtotal de venta de un lote en la grilla: suma las líneas que ya tienen precio válido.
import Decimal from "decimal.js";
import type { PriceLineResult } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";

export function groupSubtotal(
  lines: CvLineDraft[],
  results: Map<string, PriceLineResult>,
): string {
  return lines
    .reduce((sum, line) => {
      const result = results.get(line.key);
      return result?.ok ? sum.plus(result.value.totals.totalSaleUsd) : sum;
    }, new Decimal(0))
    .toFixed(2);
}
