// src/domain/dashboards/engineer-weekly.ts
// Minutos reales de un ingeniero por semana (de lunes a domingo, en La Paz) dentro del periodo, para el gráfico de
// su detalle (AGENTS.md §6).
import { toBusinessDate } from "../calendar/business-date";
import type { TimeInterval } from "../calendar/split-by-business-hours";
import { clip } from "./engineer-performance";

export type WeekMinutes = { weekStart: string; minutes: number };

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

// LIMITACIÓN: un registro que cruza la medianoche del domingo se cuenta entero en la semana en que empezó.
export function minutesByWeek(
  entries: readonly TimeInterval[],
  window: TimeInterval,
): WeekMinutes[] {
  const weeks = new Map<string, number>();
  for (const week of weekStarts(window)) weeks.set(week, 0);
  for (const entry of entries.flatMap((e) => clip(e, window))) {
    const week = mondayOf(toBusinessDate(entry.start));
    const minutes = Math.floor(
      (entry.end.getTime() - entry.start.getTime()) / MINUTE_MS,
    );
    weeks.set(week, (weeks.get(week) ?? 0) + minutes);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, minutes]) => ({ weekStart, minutes }));
}

// POR QUÉ: las semanas sin registros también se muestran, en 0, para que el gráfico no salte semanas.
function weekStarts(window: TimeInterval): string[] {
  const first = mondayOf(toBusinessDate(window.start));
  const last = toBusinessDate(new Date(window.end.getTime() - 1));
  const weeks: string[] = [];
  for (let day = first; day <= last; day = addDays(day, 7)) weeks.push(day);
  return weeks;
}

function mondayOf(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

function addDays(date: string, days: number): string {
  const time = new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}
