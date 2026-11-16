// src/domain/pricing/sum-amounts.ts
// Suma de montos opcionales escritos como texto (GROSS UP y RET DIMA de las líneas, AGENTS.md §2.1): lo vacío o lo
// que todavía no es un monto válido no suma, igual que una línea con datos por completar.
import Decimal from "decimal.js";

const AMOUNT = /^\d+(\.\d{1,2})?$/;

export function sumAmounts(values: readonly string[]): Decimal {
  return values.reduce((sum, value) => {
    const text = value.trim();
    return AMOUNT.test(text) ? sum.plus(text) : sum;
  }, new Decimal(0));
}
