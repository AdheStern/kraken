// src/domain/dashboards/sold-hours.ts
// Horas vendidas de una línea de CV, en minutos, para el tablero de ventas (AGENTS.md §2.4, §6).
import type Decimal from "decimal.js";
import { toBagMinutes } from "../hours/to-bag-minutes";

// REGLA: solo una bolsa de horas vende horas; un contrato por vigencia se vende en MESES o AÑOS y su tope es
// opcional (§2.4), así que su cantidad no son horas. Una especificación sin kind es anterior a VIGENCIA y vale
// como HORAS.
export function toSoldHoursMinutes(
  hourBagSpec: unknown,
  quantityHours: Decimal,
): number {
  if (!hourBagSpec || typeof hourBagSpec !== "object") return 0;
  if ((hourBagSpec as { kind?: unknown }).kind === "VIGENCIA") return 0;
  return toBagMinutes(quantityHours) ?? 0;
}
