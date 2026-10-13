// src/domain/sales-control/parse-decimal-text.ts
// Normaliza un número escrito o pegado desde Excel ("1.234,56", "1,234.56", "12,5", "US$ 980") a "1234.56".
// Devuelve null si el texto no es un número.

const CURRENCY_NOISE = /(US\$|\$|Bs\.?|USD|\s| )/gi;

// POR QUÉ: los montos, cantidades y factores del CV tienen como máximo 2 decimales (AGENTS.md §15.4);
// un separador seguido de exactamente 3 dígitos se lee como separador de miles, no decimal.
export function parseDecimalText(text: string): string | null {
  const cleaned = text.replace(CURRENCY_NOISE, "");
  if (cleaned === "") return null;
  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;
  if (!/^[\d.,]+$/.test(body)) return null;

  const normalized = normalizeSeparators(body);
  if (normalized === null || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const canonical = normalized.replace(/^0+(?=\d)/, "");
  return negative && canonical !== "0" ? `-${canonical}` : canonical;
}

function normalizeSeparators(body: string): string | null {
  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");
  if (lastComma === -1 && lastDot === -1) return body;
  if (lastComma !== -1 && lastDot !== -1) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    return body.split(thousands).join("").replace(decimal, ".");
  }
  const separator = lastComma !== -1 ? "," : ".";
  const parts = body.split(separator);
  const isThousands = parts.length > 2 || parts[parts.length - 1].length === 3;
  if (isThousands) {
    return parts.slice(1).every((part) => part.length === 3)
      ? parts.join("")
      : null;
  }
  return parts.join(".");
}
