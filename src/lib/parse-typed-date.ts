// src/lib/parse-typed-date.ts
// Interpreta una fecha o un rango escritos a mano (dd/mm/aaaa y variantes) y los lleva al texto "YYYY-MM-DD"
// de los formularios; formatea ese texto como dd/mm/aaaa para mostrarlo en el campo.
import { parseLocalDateText, toLocalDateText } from "./local-date-text";

export type TypedRange = { start: string; end: string };

// POR QUÉ: en un rango, el guion entre dos fechas no se confunde con el separador de una fecha: se buscan
// fechas completas en el texto en vez de partirlo por un separador.
const DATE_TOKEN =
  /\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{8}/g;
const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const DAY_FIRST = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;
const DIGITS = /^(\d{2})(\d{2})(\d{4})$/;

export function parseTypedDate(text: string): string | null {
  const clean = text.trim();
  const iso = ISO.exec(clean);
  if (iso) return build(iso[1], iso[2], iso[3]);
  const parts = DAY_FIRST.exec(clean) ?? DIGITS.exec(clean);
  if (!parts) return null;
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
  return build(year, parts[2], parts[1]);
}

// Una sola fecha es un rango de un día; el fin antes del inicio no es un rango.
export function parseTypedRange(text: string): TypedRange | null {
  const tokens = text.match(DATE_TOKEN) ?? [];
  if (tokens.length === 0 || tokens.length > 2) return null;
  const dates = tokens.map(parseTypedDate);
  if (dates.some((d) => d === null)) return null;
  const [start, end = start] = dates as string[];
  return end < start ? null : { start, end };
}

export function formatTypedDate(value: string): string {
  const match = ISO.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function build(year: string, month: string, day: string): string | null {
  const text = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = parseLocalDateText(text);
  // TRAMPA: Date corre el desborde (31/02 → 03/03); si el texto no vuelve igual, la fecha no existe.
  return date && toLocalDateText(date) === text ? text : null;
}
