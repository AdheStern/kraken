// src/domain/dashboards/utilization.ts
// Utilización de un ingeniero: minutos reales registrados sobre los minutos hábiles del periodo según el
// calendario de su ciudad (AGENTS.md §6).
import type { BusinessCalendar } from "../calendar/business-calendar";
import {
  splitByBusinessHours,
  type TimeInterval,
} from "../calendar/split-by-business-hours";
import { sharePct } from "./stats";

const MINUTE_MS = 60_000;

export function capacityMinutes(
  window: TimeInterval,
  calendar: BusinessCalendar,
): number {
  const insideMs = splitByBusinessHours(window, calendar)
    .filter((segment) => segment.isInside)
    .reduce((acc, s) => acc + (s.end.getTime() - s.start.getTime()), 0);
  return Math.floor(insideMs / MINUTE_MS);
}

// REGLA: solo cuenta lo registrado dentro del periodo; un registro que lo cruza aporta su parte (§6).
export function loggedMinutesIn(
  entries: readonly TimeInterval[],
  window: TimeInterval,
): number {
  const ms = entries.reduce((acc, entry) => {
    const start = Math.max(entry.start.getTime(), window.start.getTime());
    const end = Math.min(entry.end.getTime(), window.end.getTime());
    return acc + Math.max(0, end - start);
  }, 0);
  return Math.floor(ms / MINUTE_MS);
}

// POR QUÉ: puede pasar de 100% (horas extra); se muestra tal cual en vez de recortarlo.
export function utilizationPct(
  loggedMinutes: number,
  capacity: number,
): number | null {
  return sharePct(loggedMinutes, capacity);
}
