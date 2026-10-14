// src/features/admin/parameter-definitions.ts
// Parámetros del sistema que se editan desde la administración: qué significa cada uno, cómo se escribe y en
// qué forma se guarda en core.parametro (la que leen src/server/parameters.ts y sus usos).
// REGLA: son valores [CONFIRMAR] aislados en parámetros, no constantes (AGENTS.md §0.16, §14).
import Decimal from "decimal.js";
import { z } from "zod";

export const PARAMETER_KEYS = [
  "cv.umbral_gg_usd",
  "fx.desvio_max_pct",
  "horas.alerta_consumo_pct",
  "horas.aviso_vencimiento_dias",
] as const;

export type ParameterKey = (typeof PARAMETER_KEYS)[number];

export type ParameterValue = string | number | number[];

export type ParameterDefinition = {
  label: string;
  help: string;
  unit: string;
  placeholder: string;
  // POR QUÉ: el formulario manda texto; cada parámetro lo valida y lo convierte a su forma guardada.
  parse: z.ZodType<ParameterValue, string>;
};

// REGLA: montos con Decimal, nunca number (AGENTS.md §0.3); se guardan como texto con 2 decimales.
const decimal = (max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, message)
    .transform((v) => new Decimal(v))
    .refine((d) => d.gt(0) && d.lte(max), message)
    .transform((d) => d.toFixed(2));

const percentList = z
  .string()
  .transform((v) =>
    v
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map(Number),
  )
  .refine(
    (list) =>
      list.length > 0 &&
      list.every((n) => Number.isInteger(n) && n >= 1 && n <= 100),
    "Escribe porcentajes enteros entre 1 y 100, separados por comas (80, 100).",
  )
  .transform((list) => [...new Set(list)].sort((a, b) => a - b));

export const PARAMETER_DEFINITIONS: Record<ParameterKey, ParameterDefinition> =
  {
    "cv.umbral_gg_usd": {
      label: "Umbral del gerente general",
      help: "Total de venta desde el que el GG también aprueba. Rige para las versiones que se envíen desde ahora; las enviadas conservan el suyo.",
      unit: "USD",
      placeholder: "50000.00",
      parse: decimal(
        100_000_000,
        "Escribe un monto en USD mayor a 0, con hasta 2 decimales.",
      ),
    },
    "fx.desvio_max_pct": {
      label: "Desvío máximo del tipo de cambio",
      help: "Si el TC de costo o de venta se aleja del oficial más que este %, el editor del CV avisa sin bloquear.",
      unit: "%",
      placeholder: "2",
      parse: decimal(
        100,
        "Escribe un % mayor a 0 y hasta 100, con hasta 2 decimales.",
      ),
    },
    "horas.alerta_consumo_pct": {
      label: "Avisos de consumo de las bolsas",
      help: "Al cruzar cada % se avisa al vendedor, a los gerentes de las áreas y a los encargados; el menor marca la bolsa en riesgo.",
      unit: "%",
      placeholder: "80, 100",
      parse: percentList,
    },
    "horas.aviso_vencimiento_dias": {
      label: "Aviso de vencimiento de las bolsas",
      help: "Días antes del vencimiento en que se avisa; el día del vencimiento se avisa siempre.",
      unit: "días",
      placeholder: "30",
      parse: z
        .string()
        .trim()
        .regex(/^\d+$/, "Escribe un número entero de días.")
        .transform(Number)
        .refine((n) => n >= 1 && n <= 365, "Escribe entre 1 y 365 días."),
    },
  };

export function isParameterKey(value: string): value is ParameterKey {
  return (PARAMETER_KEYS as readonly string[]).includes(value);
}

export function parameterText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return "";
}
