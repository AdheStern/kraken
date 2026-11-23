// src/domain/customers/phone-format.ts
// Teléfonos de contacto con código de país: separa el número en bloques según el país y lo guarda como
// «+591 7123 4567». Lo que no se reconoce (varios números, internos) queda como se escribió (país «OTRO»).

import {
  DEFAULT_PHONE_COUNTRY,
  findPhoneCountry,
  PHONE_COUNTRIES_BY_DIAL,
  type PhoneCountry,
} from "./phone-countries";
import { PHONE_PATTERNS, type PhonePattern } from "./phone-patterns";

export const OTHER_PHONE_COUNTRY = "OTRO";
const MAX_DIGITS = 15;

export type ParsedPhone = { country: string; national: string };

// «71234567» → «7123 4567». POR QUÉ: mientras se escribe se usa el patrón del largo esperado, para que los
// bloques no salten; un número más largo que todo patrón deja los últimos 4 juntos y el resto de a 3.
export function formatNationalPhone(iso: string, digits: string): string {
  const fits = (p: PhonePattern) => !p.lead || p.lead.test(digits);
  const patterns = (PHONE_PATTERNS[iso] ?? []).filter(fits);
  const pattern =
    patterns.find((p) => p.length === digits.length) ??
    patterns.find((p) => p.length > digits.length);
  return splitGroups(digits, pattern?.groups ?? fallbackGroups(digits.length));
}

// POR QUÉ: los teléfonos cargados antes del selector no traen código; se asumen bolivianos. Un código compartido
// (+1) se lee como `preferred` si es de ese código (Canadá elegido) y si no, como su país principal.
export function parsePhone(
  value: string | null,
  preferred?: string,
): ParsedPhone {
  const text = value?.trim() ?? "";
  if (!text) return { country: DEFAULT_PHONE_COUNTRY, national: "" };
  if (/[^\d\s+\-().]/.test(text) || text.lastIndexOf("+") > 0) {
    return { country: OTHER_PHONE_COUNTRY, national: text };
  }
  const digits = text.replace(/\D/g, "");
  if (text.startsWith("+")) {
    const country = matchDialCode(digits, preferred);
    if (!country) return { country: OTHER_PHONE_COUNTRY, national: text };
    return {
      country: country.iso,
      national: digits.slice(country.dialCode.length),
    };
  }
  const national =
    digits.startsWith("591") && digits.length === 11 ? digits.slice(3) : digits;
  return { country: DEFAULT_PHONE_COUNTRY, national };
}

// Valor que se guarda: «+591 7123 4567»; sin número, vacío. En «OTRO» el texto va tal cual.
export function toStoredPhone(parsed: ParsedPhone): string {
  if (parsed.country === OTHER_PHONE_COUNTRY) return parsed.national.trim();
  const country = findPhoneCountry(parsed.country);
  const digits = parsed.national.replace(/\D/g, "");
  if (!country || !digits) return "";
  const national = digits.slice(0, MAX_DIGITS - country.dialCode.length);
  return `+${country.dialCode} ${formatNationalPhone(country.iso, national)}`;
}

// Posición en el texto con formato tras el dígito número `digitCount` (para no perder el cursor al reformatear).
export function caretAfterDigits(
  formatted: string,
  digitCount: number,
): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i] ?? "") && ++seen === digitCount) return i + 1;
  }
  return formatted.length;
}

function matchDialCode(
  digits: string,
  preferred?: string,
): PhoneCountry | undefined {
  const own = preferred ? findPhoneCountry(preferred) : undefined;
  if (own && digits.startsWith(own.dialCode)) return own;
  // TRAMPA: sort es estable; dentro de un mismo código queda primero el país principal.
  return [...PHONE_COUNTRIES_BY_DIAL]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => digits.startsWith(c.dialCode));
}

function fallbackGroups(length: number): number[] {
  if (length <= 4) return [length];
  const head = length - 4;
  const groups = Array.from({ length: Math.floor(head / 3) }, () => 3);
  return head % 3 ? [head % 3, ...groups, 4] : [...groups, 4];
}

function splitGroups(digits: string, groups: number[]): string {
  const parts: string[] = [];
  let start = 0;
  for (const size of groups) {
    if (start >= digits.length) break;
    parts.push(digits.slice(start, start + size));
    start += size;
  }
  if (start < digits.length) parts.push(digits.slice(start));
  return parts.join(" ");
}
