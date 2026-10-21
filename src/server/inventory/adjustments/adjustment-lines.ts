// src/server/inventory/adjustments/adjustment-lines.ts
// Forma de las líneas de una solicitud de ajuste (inv.solicitud_ajuste.lineas, JSON): delta con signo, costo para
// lo que entra sin stock, seriales, la línea del traspaso que se da de baja y la foto del conteo (AGENTS.md §2.8).
import { z } from "zod";

const signedQuantity = z
  .string()
  .regex(
    /^-?\d+(\.\d{1,2})?$/,
    "La diferencia es un número con hasta 2 decimales.",
  )
  .refine((v) => Number(v) !== 0, "La diferencia no puede ser 0.");

export const adjustmentLineSchema = z.object({
  productId: z.uuid(),
  delta: signedQuantity,
  unitCostUsd: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "El costo es 0 o más con hasta 2 decimales.")
    .nullable(),
  serials: z.array(z.string().trim().min(1).max(80)).max(500),
  transferLineId: z.uuid().nullable(),
  // POR QUÉ: la foto del sistema al contar; el ajuste aplica el delta, no la cantidad contada.
  systemQuantity: z.string().nullable(),
});

export const adjustmentLinesSchema = z
  .array(adjustmentLineSchema)
  .min(1, "Agrega al menos una diferencia.");

export type AdjustmentLine = z.infer<typeof adjustmentLineSchema>;
