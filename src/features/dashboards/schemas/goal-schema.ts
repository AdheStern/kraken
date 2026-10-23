// src/features/dashboards/schemas/goal-schema.ts
// Meta mensual (KGI) tal como se escribe en la grilla: monto en USD o horas; vacía, la meta se quita
// (AGENTS.md §6, reglas 3 y 4). El mismo esquema valida el formulario y la action.
import Decimal from "decimal.js";
import { z } from "zod";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import { hasAtMostTwoDecimals } from "@/domain/pricing/money";
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";

export const GOAL_INDICATORS = [
  "VENTAS_USD",
  "MARGEN_USD",
  "HORAS_VENDIDAS",
] as const;

export const goalSchema = z.object({
  areaId: z.uuid().nullable(),
  indicator: z.enum(GOAL_INDICATORS),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  value: z.string().max(40),
});

export type GoalInput = z.input<typeof goalSchema>;

export type GoalValue =
  | { kind: "VACIA" }
  | { kind: "USD"; valueUsd: string }
  | { kind: "MINUTOS"; minutes: number };

// REGLA: montos con hasta 2 decimales (§15.4); horas que den minutos enteros (regla 4: 1.5 h sí, 1.01 h no).
export function parseGoalValue(
  indicator: (typeof GOAL_INDICATORS)[number],
  text: string,
): GoalValue | { error: string } {
  if (text.trim() === "") return { kind: "VACIA" };
  const normalized = parseDecimalText(text);
  if (normalized === null || normalized.startsWith("-"))
    return { error: "Escribe un número de 0 o más." };
  const value = new Decimal(normalized);
  if (indicator === "HORAS_VENDIDAS") {
    const minutes = toBagMinutes(value);
    return minutes === null
      ? {
          error: "Las horas deben dar minutos enteros (por ejemplo 120 o 7.5).",
        }
      : { kind: "MINUTOS", minutes };
  }
  return hasAtMostTwoDecimals(value)
    ? { kind: "USD", valueUsd: value.toFixed(2) }
    : { error: "El monto lleva como máximo 2 decimales." };
}
