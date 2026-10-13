// src/lib/format-amount.ts
// Presentación de montos decimales recibidos como texto ("1234.5" → "1,234.50"), sin pasar por number.
// POR QUÉ: el dinero viaja como texto desde el servidor; convertirlo a number para formatear perdería precisión.

export function formatAmount(value: string, decimals = 2): string {
  const negative = value.trim().startsWith("-");
  const [rawInteger = "0", rawFraction = ""] = value
    .trim()
    .replace("-", "")
    .split(".");
  const integer = rawInteger
    .replace(/^0+(?=\d)/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = rawFraction.padEnd(decimals, "0").slice(0, decimals);
  const body = decimals > 0 ? `${integer}.${fraction}` : integer;
  return negative ? `-${body}` : body;
}
