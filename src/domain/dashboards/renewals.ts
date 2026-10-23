// src/domain/dashboards/renewals.ts
// Renovaciones próximas: días que faltan para el fin de vigencia y tramos de 30, 60 y 90 días (AGENTS.md §2.1
// "Vigencia" y §6).
import Decimal from "decimal.js";

export const RENEWAL_HORIZON_DAYS = 90;

const DAY_MS = 86_400_000;
const BANDS = [30, 60, 90] as const;

export type RenewalBand = (typeof BANDS)[number];

// REGLA: fechas civiles "yyyy-MM-dd" de La Paz (regla 5); la diferencia es en días de calendario.
export function daysUntil(today: string, date: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS,
  );
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

// POR QUÉ: tramos excluyentes (0–30, 31–60, 61–90) para que cada renovación se cuente una sola vez.
export function renewalBands(
  items: readonly { daysLeft: number; saleUsd: Decimal }[],
): { days: RenewalBand; count: number; saleUsd: Decimal }[] {
  return BANDS.map((days, i) => {
    const from = i === 0 ? 0 : BANDS[i - 1] + 1;
    const inBand = items.filter(
      (r) => r.daysLeft >= from && r.daysLeft <= days,
    );
    return {
      days,
      count: inBand.length,
      saleUsd: inBand.reduce((acc, r) => acc.plus(r.saleUsd), new Decimal(0)),
    };
  });
}
