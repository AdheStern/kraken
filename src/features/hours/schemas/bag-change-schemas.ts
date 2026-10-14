// src/features/hours/schemas/bag-change-schemas.ts
// Entradas del ajuste manual y del cierre de una bolsa; el mismo zod valida el diálogo y la action.
import { z } from "zod";

const reason = z
  .string()
  .trim()
  .min(5, "Explica el motivo (mínimo 5 caracteres).")
  .max(300, "El motivo admite hasta 300 caracteres.");

export const adjustHourBagSchema = z.object({
  bagId: z.uuid(),
  operation: z.enum(["SUMAR", "RESTAR"]),
  hours: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Escribe las horas como 1.5 o 2.25."),
  reason,
});

export const closeHourBagSchema = z.object({ bagId: z.uuid(), reason });

export type AdjustHourBagInput = z.infer<typeof adjustHourBagSchema>;
export type CloseHourBagInput = z.infer<typeof closeHourBagSchema>;
