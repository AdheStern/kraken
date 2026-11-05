// src/domain/sales-control/shift-coverage.ts
// Vigencia del periodo siguiente al renovar una línea: empieza el día después del fin anterior y dura lo mismo
// (AGENTS.md §2.1 "Vigencia", renovación en un clic, decisión 2026-11-05).

export type Coverage = { start: string; end: string };

const DAY_MS = 86_400_000;

// POR QUÉ: un periodo de meses completos (01/12 al 30/11) se renueva por meses y no por días, para que un año
// bisiesto no corra la fecha de fin; cualquier otro periodo se renueva por la misma cantidad de días.
export function shiftCoverage({ start, end }: Coverage): Coverage {
  const from = toUtc(start);
  const next = toUtc(end) + DAY_MS;
  const months = wholeMonthsBetween(from, next);
  if (months !== null)
    return {
      start: toText(next),
      end: toText(addMonths(next, months) - DAY_MS),
    };
  return { start: toText(next), end: toText(next + (next - from) - DAY_MS) };
}

function wholeMonthsBetween(from: number, to: number): number | null {
  const a = new Date(from);
  const b = new Date(to);
  if (a.getUTCDate() !== b.getUTCDate()) return null;
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth());
  return months > 0 ? months : null;
}

function addMonths(instant: number, months: number): number {
  const date = new Date(instant);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    date.getUTCDate(),
  );
}

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function toText(instant: number): string {
  return new Date(instant).toISOString().slice(0, 10);
}
