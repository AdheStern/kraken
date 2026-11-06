// src/domain/dashboards/hours-usage.ts
// Uso de las horas vendidas agrupado por cliente, tecnología o área: vendido, descontado, vencido sin usar, % de
// uso y lo pendiente sin bolsa, que es trabajo por encima de lo vendido (decisión 2026-11-05, AGENTS.md §6).
import { type MovementTotals, summarizeBag } from "../hours/summarize-bag";
import { sharePct } from "./stats";

export type UsageBag = { key: string; label: string; totals: MovementTotals };

export type UsageRow = {
  key: string;
  label: string;
  bags: number;
  soldMinutes: number;
  consumedMinutes: number;
  expiredMinutes: number;
  pendingMinutes: number;
  usagePct: number | null;
};

// REGLA: las cifras de cada bolsa salen de summarizeBag, la única definición (§6); aquí solo se suman por grupo.
export function hoursUsageBreakdown(
  bags: readonly UsageBag[],
  pendingByKey: ReadonlyMap<string, number> = new Map(),
): UsageRow[] {
  const rows = new Map<string, UsageRow>();
  for (const bag of bags) {
    const figures = summarizeBag(bag.totals, 0);
    const row = rows.get(bag.key) ?? empty(bag.key, bag.label);
    row.bags += 1;
    row.soldMinutes += figures.soldMinutes;
    row.consumedMinutes += figures.consumedMinutes;
    row.expiredMinutes += figures.expiredMinutes;
    rows.set(bag.key, row);
  }
  return [...rows.values()]
    .map((row) => ({
      ...row,
      pendingMinutes: pendingByKey.get(row.key) ?? 0,
      usagePct: sharePct(row.consumedMinutes, row.soldMinutes),
    }))
    .sort(byUsage);
}

function empty(key: string, label: string): UsageRow {
  return {
    key,
    label,
    bags: 0,
    soldMinutes: 0,
    consumedMinutes: 0,
    expiredMinutes: 0,
    pendingMinutes: 0,
    usagePct: null,
  };
}

// POR QUÉ: primero lo que más se usa o ya trabaja sin bolsa: es lo que se está cotizando de menos.
function byUsage(a: UsageRow, b: UsageRow): number {
  return (
    b.pendingMinutes - a.pendingMinutes ||
    (b.usagePct ?? -1) - (a.usagePct ?? -1) ||
    a.label.localeCompare(b.label, "es")
  );
}
