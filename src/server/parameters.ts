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
