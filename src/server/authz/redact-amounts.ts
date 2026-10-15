// src/server/authz/redact-amounts.ts
// Oculta los montos de un antes/después de auditoría a quien no puede verlos (AGENTS.md §2.9: el
// administrador del sistema gestiona, pero no ve montos por ese rol; un ingeniero nunca, regla 12).

export const REDACTED = "•••";

// REGLA: costo, venta, precio, factor, margen y todo campo en USD o Bs es un monto.
const AMOUNT_KEY =
  /(usd|bs)$|^(factor|margin)|cost|sale|price|amount|margen|costo|venta|precio/i;

export function redactAmounts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAmounts);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key,
      AMOUNT_KEY.test(key) && inner !== null ? REDACTED : redactAmounts(inner),
    ]),
  );
}
