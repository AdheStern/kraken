// src/domain/tickets/time-entry-rules.ts
// Reglas de un registro de tiempo manual: rango válido, sin futuro, duración máxima y marca de tardío
// (AGENTS.md §2.6 "Registro de tiempo").
import { formatInTimeZone } from "date-fns-tz";
import { BUSINESS_TIME_ZONE } from "@/domain/calendar/business-date";

// REGLA: se marca tardío si se carga más de 48 h después de su fin (§2.6).
export const LATE_ENTRY_MS = 48 * 60 * 60_000;
// POR QUÉ: un tramo manual de más de 16 h casi siempre es un error de fecha; se pide partirlo.
export const MAX_MANUAL_ENTRY_MS = 16 * 60 * 60_000;
// REGLA: un contador abierto más de 10 h avisa al ingeniero y al encargado (§2.6, job timers.stale).
export const STALE_TIMER_MS = 10 * 60 * 60_000;

export function manualEntryIssue(
  startedAt: Date,
  endedAt: Date,
  now: Date,
): string | null {
  if (endedAt.getTime() <= startedAt.getTime())
    return "El fin debe ser posterior al inicio.";
  if (endedAt.getTime() > now.getTime())
    return `La hora de fin todavía no llegó (son las ${formatInTimeZone(now, BUSINESS_TIME_ZONE, "HH:mm")} en La Paz). Revisa la fecha y la hora.`;
  if (endedAt.getTime() - startedAt.getTime() > MAX_MANUAL_ENTRY_MS)
    return "Un registro manual dura hasta 16 h; pártelo en tramos.";
  return null;
}

export function isLateEntry(endedAt: Date, recordedAt: Date): boolean {
  return recordedAt.getTime() - endedAt.getTime() > LATE_ENTRY_MS;
}
