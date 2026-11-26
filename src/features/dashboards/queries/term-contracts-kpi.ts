// src/features/dashboards/queries/term-contracts-kpi.ts
// Indicador de contratos por vigencia del tablero de ventas a partir de sus hechos, contra el periodo anterior
// (AGENTS.md §2.4, §6). Montos como texto exacto (regla 3).
import Decimal from "decimal.js";
import { variationPct } from "@/domain/dashboards/goal-progress";
import type { SaleFact } from "@/domain/dashboards/sales-breakdown";
import { summarizeTermContracts } from "@/domain/dashboards/term-contracts";
import type { TermContractsKpi } from "../types";

export function termContractsKpi(
  facts: readonly SaleFact[],
  previousFacts: readonly SaleFact[],
): TermContractsKpi {
  const termsOf = (list: readonly SaleFact[]) =>
    summarizeTermContracts(
      list.flatMap((f) =>
        f.term
          ? [{ termMonths: f.term.months, saleUsd: f.amounts.saleUsd }]
          : [],
      ),
    );
  const now = termsOf(facts);
  const before = termsOf(previousFacts);
  return {
    count: now.count,
    previousCount: before.count,
    variationPct: variationPct(
      new Decimal(now.count),
      new Decimal(before.count),
    ),
    months: now.months,
    saleUsd: now.saleUsd.toFixed(2),
    byDuration: now.byDuration.map((d) => ({
      months: d.months,
      count: d.count,
      saleUsd: d.saleUsd.toFixed(2),
    })),
  };
}
