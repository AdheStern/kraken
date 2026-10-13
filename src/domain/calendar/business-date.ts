// src/domain/calendar/business-date.ts
// Fecha y año de negocio de un instante UTC según el calendario de Bolivia (America/La_Paz).
// REGLA: fechas en UTC; el calendario de negocio se calcula en America/La_Paz (AGENTS.md regla 5, ADR-15).
import { formatInTimeZone } from "date-fns-tz";

export const BUSINESS_TIME_ZONE = "America/La_Paz";

// Devuelve la fecha civil "yyyy-MM-dd" en La Paz.
export function toBusinessDate(instant: Date): string {
  return formatInTimeZone(instant, BUSINESS_TIME_ZONE, "yyyy-MM-dd");
}

export function toBusinessYear(instant: Date): number {
  return Number(formatInTimeZone(instant, BUSINESS_TIME_ZONE, "yyyy"));
}
