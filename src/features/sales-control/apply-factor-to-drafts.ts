// src/features/sales-control/apply-factor-to-drafts.ts
// Aplica un factor a las líneas de un lote o de una tecnología ("FACTOR CISCO", AGENTS.md §2.2).
// Cada línea pasa por el dominio de precios: las de costo 0 se saltan porque solo admiten PRECIO.
import Decimal from "decimal.js";
import { computeLinePricing } from "@/domain/pricing/compute-line-pricing";
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

export type ApplyFactorOutcome =
  | { ok: true; lines: CvLineDraft[]; applied: number; skipped: number }
  | { ok: false; message: string };

export function applyFactorToDrafts(
  lines: readonly CvLineDraft[],
  factorText: string,
  shouldApply: (line: CvLineDraft) => boolean,
): ApplyFactorOutcome {
  const parsed = parseDecimalText(factorText, { allowThousands: false });
  const factor = parsed === null ? null : new Decimal(parsed);
  if (!factor?.greaterThan(0) || factor.decimalPlaces() > 2) {
    return {
      ok: false,
      message:
        "Escribe un factor mayor que 0 con hasta 2 decimales, p. ej. 1.35.",
    };
  }
  let applied = 0;
  let skipped = 0;

  const next = lines.map((line) => {
    if (line.kind !== "ITEM" || !shouldApply(line)) return line;
    const cost = parseDecimalText(line.unitCostUsd);
    const result =
      cost === null
        ? null
        : computeLinePricing(new Decimal(cost), { source: "FACTOR", factor });
    if (!result?.ok) {
      skipped += 1;
      return line;
    }
    applied += 1;
    return {
      ...line,
      pricingSource: "FACTOR" as const,
      factor: factor.toFixed(2),
    };
  });
  return { ok: true, lines: next, applied, skipped };
}
