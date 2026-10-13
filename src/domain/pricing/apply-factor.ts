// src/domain/pricing/apply-factor.ts
// Aplica un factor a un conjunto de líneas (un grupo, una tecnología o todas): las pasa a modo FACTOR.
// Las líneas con costo 0 se dejan como están, porque solo admiten PRECIO (AGENTS.md §2.2).
import type Decimal from "decimal.js";
import { computeLinePricing, type LinePricing } from "./compute-line-pricing";

type PricedLine = { unitCostUsd: Decimal; pricing: LinePricing };

export type ApplyFactorResult<T> =
  | { ok: true; lines: T[]; skippedZeroCost: number }
  | { ok: false; error: "FACTOR_INVALIDO" };

export function applyFactor<T extends PricedLine>(
  lines: readonly T[],
  factor: Decimal,
  shouldApply: (line: T) => boolean,
): ApplyFactorResult<T> {
  let skippedZeroCost = 0;
  const updated: T[] = [];

  for (const line of lines) {
    if (!shouldApply(line)) {
      updated.push(line);
      continue;
    }
    const result = computeLinePricing(line.unitCostUsd, {
      source: "FACTOR",
      factor,
    });
    if (result.ok) {
      updated.push({ ...line, pricing: result.value });
    } else if (result.error === "COSTO_CERO_REQUIERE_PRECIO") {
      skippedZeroCost += 1;
      updated.push(line);
    } else {
      return { ok: false, error: "FACTOR_INVALIDO" };
    }
  }
  return { ok: true, lines: updated, skippedZeroCost };
}
