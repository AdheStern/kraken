// src/domain/hours/to-bag-minutes.ts
// Convierte las horas de una línea de CV en los minutos enteros de su bolsa (AGENTS.md §15.4).
import type Decimal from "decimal.js";

// REGLA: el tiempo se guarda en minutos enteros (regla 4): 20 h = 1,200 min; 1.25 h = 75 min sirve, 1.01 h no.
// Devuelve null si las horas son negativas o no dan minutos enteros.
export function toBagMinutes(quantityHours: Decimal): number | null {
  const minutes = quantityHours.times(60);
  if (minutes.isNegative() || !minutes.isInteger()) return null;
  return minutes.toNumber();
}
