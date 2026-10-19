// src/domain/hours/expiry.ts
// Vencimiento de una bolsa en fechas civiles de La Paz ("yyyy-MM-dd"): vencida, días restantes y aviso.
// Regla normativa: AGENTS.md §2.4 (vencimiento y alertas). "Hoy" llega de toBusinessDate(clock.now()).
import { fromZonedTime } from "date-fns-tz";
import { BUSINESS_TIME_ZONE } from "@/domain/calendar/business-date";

const DAY_MS = 86_400_000;

// REGLA: la bolsa vale todo el día de su vencimiento; vence al empezar el día siguiente.
export function isBagExpired(expiresOn: string | null, today: string): boolean {
  return expiresOn !== null && toDayNumber(today) > toDayNumber(expiresOn);
}

export function daysUntilExpiry(expiresOn: string, today: string): number {
  return toDayNumber(expiresOn) - toDayNumber(today);
}

// POR QUÉ: los días de anticipación (30, confirmados por DIMA) vienen del parámetro horas.aviso_vencimiento_dias.
export function isExpiryWarningDue(
  expiresOn: string | null,
  today: string,
  warningDays: number,
): boolean {
  if (expiresOn === null) return false;
  const days = daysUntilExpiry(expiresOn, today);
  return days >= 0 && days <= warningDays;
}

// REGLA: la bolsa no acepta trabajo realizado después de su vencimiento (§2.4): el límite es las 00:00 en
// La Paz del día siguiente. Lo usa allocateTicketHours como acceptsWorkUntil.
export function toWorkDeadline(expiresOn: string | null): Date | null {
  if (expiresOn === null) return null;
  const nextDay = new Date((toDayNumber(expiresOn) + 1) * DAY_MS);
  return fromZonedTime(
    `${nextDay.toISOString().slice(0, 10)}T00:00`,
    BUSINESS_TIME_ZONE,
  );
}

function toDayNumber(date: string): number {
  const time = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(time))
    throw new RangeError(`Fecha civil inválida: ${date}.`);
  return time / DAY_MS;
}
