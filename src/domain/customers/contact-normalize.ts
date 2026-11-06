// src/domain/customers/contact-normalize.ts
// Normaliza nombre, correo y teléfono de un contacto para reconocer a la misma persona aunque se escriba distinto
// (decisión 2026-11-06). REGLA: la migración 20261106140000 calcula el nombre igual en SQL.

const COMBINING_MARKS = /\p{M}/gu;

// «  José   Pérez » y «jose perez» son el mismo nombre: sin tildes, en minúsculas y con un solo espacio.
export function normalizeContactName(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(email: string | null): string | null {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

// POR QUÉ: «+591 7123-4567», «591 71234567» y «71234567» son el mismo teléfono boliviano.
export function normalizePhone(phone: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const local =
    digits.startsWith("591") && digits.length > 8 ? digits.slice(3) : digits;
  return local.length >= 7 ? local : null;
}
