// src/domain/dashboards/term-contracts.ts
// Contratos por vigencia vendidos en un periodo: cuántos, cuántos meses de soporte y su venta, por duración
// (AGENTS.md §2.4, §6). Un contrato es una línea con «Soporte por vigencia» de la versión aprobada vigente.
import Decimal from "decimal.js";

export type TermContractFact = { termMonths: number | null; saleUsd: Decimal };

export type TermDuration = { months: number; count: number; saleUsd: Decimal };

export type TermContractsSummary = {
  count: number;
  months: number;
  saleUsd: Decimal;
  byDuration: TermDuration[];
};

const DAY_MS = 86_400_000;
const DAYS_PER_MONTH = 365.25 / 12;

// POR QUÉ: la duración sale de las fechas de vigencia (obligatorias en un contrato, §2.1) y no de la cantidad,
// que a veces es «1 servicio». El fin es inclusivo: 01/06/2026–31/05/2027 son 12 meses. Si no son meses
// completos, se redondean los días (30/03/2026–30/03/2027 también son 12).
export function toTermMonths(
  start: string | null,
  end: string | null,
): number | null {
  if (!start || !end) return null;
  const from = new Date(`${start}T00:00:00Z`);
  const next = new Date(Date.parse(`${end}T00:00:00Z`) + DAY_MS);
  if (next <= from) return null;
  if (from.getUTCDate() === next.getUTCDate())
    return (
      (next.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      (next.getUTCMonth() - from.getUTCMonth())
    );
  const days = (next.getTime() - from.getTime()) / DAY_MS;
  return Math.max(1, Math.round(days / DAYS_PER_MONTH));
}

// REGLA: un contrato sin fechas válidas cuenta como contrato pero no suma meses ni entra al desglose por duración.
export function summarizeTermContracts(
  facts: readonly TermContractFact[],
): TermContractsSummary {
  const byMonths = new Map<number, TermDuration>();
  let summary: TermContractsSummary = {
    count: 0,
    months: 0,
    saleUsd: new Decimal(0),
    byDuration: [],
  };
  for (const fact of facts) {
    summary = {
      ...summary,
      count: summary.count + 1,
      months: summary.months + (fact.termMonths ?? 0),
      saleUsd: summary.saleUsd.plus(fact.saleUsd),
    };
    if (fact.termMonths === null) continue;
    const row = byMonths.get(fact.termMonths) ?? {
      months: fact.termMonths,
      count: 0,
      saleUsd: new Decimal(0),
    };
    byMonths.set(fact.termMonths, {
      ...row,
      count: row.count + 1,
      saleUsd: row.saleUsd.plus(fact.saleUsd),
    });
  }
  const byDuration = [...byMonths.values()].sort((a, b) => a.months - b.months);
  return { ...summary, byDuration };
}
