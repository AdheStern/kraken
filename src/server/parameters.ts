// src/server/parameters.ts
// Lectura de parámetros del sistema (core.parametro), editables por el administrador sin desplegar.
import { prisma } from "@/server/db";

// POR QUÉ: los valores numéricos se guardan como texto en el JSON para no perder decimales.
export async function getDecimalParameter(
  key: string,
  fallback: string,
): Promise<string> {
  const parameter = await prisma.parameter.findUnique({ where: { key } });
  const value = parameter?.value;
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

// POR QUÉ: los umbrales se guardan como lista JSON ([80, 100]); un valor inválido usa el respaldo.
export async function getIntListParameter(
  key: string,
  fallback: readonly number[],
): Promise<number[]> {
  const parameter = await prisma.parameter.findUnique({ where: { key } });
  const value = parameter?.value;
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => Number.isInteger(item) && Number(item) > 0)
  )
    return value.map(Number);
  return [...fallback];
}

export async function getIntParameter(
  key: string,
  fallback: number,
): Promise<number> {
  const parameter = await prisma.parameter.findUnique({ where: { key } });
  const value = Number(parameter?.value);
  return parameter && Number.isInteger(value) && value >= 0 ? value : fallback;
}
