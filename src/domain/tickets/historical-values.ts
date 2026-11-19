// src/domain/tickets/historical-values.ts
// Fechas y horas escritas o pegadas en la carga histórica de tickets: dd/mm/aaaa (o aaaa-mm-dd) y hh:mm, llevadas
// a un instante UTC con el calendario de La Paz (AGENTS.md regla 5, ADR-15).
import { fromZonedTime } from "date-fns-tz";
import { BUSINESS_TIME_ZONE } from "../calendar/business-date";

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const DAY_FIRST = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;
const TIME = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/;

// Devuelve "yyyy-MM-dd" o null si el texto no es una fecha que exista.
export function parseHistoricalDate(text: string): string | null {
  const clean = text.trim();
  const iso = ISO.exec(clean);
  const parts = iso
    ? [iso[1], iso[2], iso[3]]
    : (() => {
        const m = DAY_FIRST.exec(clean);
        return m ? [m[3].length === 2 ? `20${m[3]}` : m[3], m[2], m[1]] : null;
      })();
  if (!parts) return null;
  const date = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  // TRAMPA: Date corre el desborde (31/02 → 03/03); si no vuelve igual, la fecha no existe.
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
}

// Devuelve "HH:mm" o null.
export function parseHistoricalTime(text: string): string | null {
  const m = TIME.exec(text.trim());
  if (!m) return null;
  const [hours, minutes] = [Number(m[1]), Number(m[2])];
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${m[2]}`;
}

export function toBusinessInstant(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, BUSINESS_TIME_ZONE);
}
