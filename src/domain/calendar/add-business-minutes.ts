// src/domain/calendar/add-business-minutes.ts
// Instante en que se cumplen N minutos dentro del horario de oficina a partir de otro instante; la base del
// vencimiento de un SLA 8x5 (AGENTS.md §2.7 "8x5: el reloj corre solo en horario de oficina").
import type { BusinessCalendar } from "./business-calendar";
import { splitByBusinessHours } from "./split-by-business-hours";

const DAY_MS = 86_400_000;
// LIMITACIÓN: se busca hasta un año; un calendario sin franjas nunca acumula minutos y devuelve null.
const MAX_DAYS = 366;

export function addBusinessMinutes(
  from: Date,
  minutes: number,
  calendar: BusinessCalendar,
): Date | null {
  if (minutes <= 0) return from;
  let remainingMs = minutes * 60_000;
  let cursor = from;
  for (let day = 0; day < MAX_DAYS; day++) {
    const next = new Date(cursor.getTime() + DAY_MS);
    for (const segment of splitByBusinessHours(
      { start: cursor, end: next },
      calendar,
    )) {
      if (!segment.isInside) continue;
      const length = segment.end.getTime() - segment.start.getTime();
      if (length >= remainingMs)
        return new Date(segment.start.getTime() + remainingMs);
      remainingMs -= length;
    }
    cursor = next;
  }
  return null;
}

// Milisegundos dentro del horario de oficina entre dos instantes.
export function businessMsBetween(
  start: Date,
  end: Date,
  calendar: BusinessCalendar,
): number {
  if (end <= start) return 0;
  return splitByBusinessHours({ start, end }, calendar)
    .filter((s) => s.isInside)
    .reduce((sum, s) => sum + s.end.getTime() - s.start.getTime(), 0);
}
