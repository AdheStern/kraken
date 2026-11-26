// src/domain/dashboards/term-bags.ts
// Foto de hoy de los contratos por vigencia activos: cuántos, con y sin tope, tiempo usado, los que tienen tope
// cerca de agotarse y los que vencen pronto (AGENTS.md §2.4, §6).

export type TermBag = {
  consumedMinutes: number;
  consumedPct: number;
  isUncapped: boolean;
  daysToExpiry: number | null;
};

export type TermBagsSummary = {
  active: number;
  uncapped: number;
  usedMinutes: number;
  nearCap: number;
  expiring: { days: 30 | 60 | 90; count: number }[];
};

const EXPIRY_BANDS = [30, 60, 90] as const;

// REGLA: «cerca del tope» usa el primer umbral de alerta de las bolsas (80 %, §2.4); se recibe para no fijarlo.
// Las bandas de vencimiento son acumulativas, como las de renovaciones (§6).
export function summarizeTermBags(
  bags: readonly TermBag[],
  nearCapPct: number,
): TermBagsSummary {
  return {
    active: bags.length,
    uncapped: bags.filter((b) => b.isUncapped).length,
    usedMinutes: bags.reduce((acc, b) => acc + b.consumedMinutes, 0),
    nearCap: bags.filter((b) => !b.isUncapped && b.consumedPct >= nearCapPct)
      .length,
    expiring: EXPIRY_BANDS.map((days) => ({
      days,
      count: bags.filter(
        (b) => b.daysToExpiry !== null && b.daysToExpiry <= days,
      ).length,
    })),
  };
}
