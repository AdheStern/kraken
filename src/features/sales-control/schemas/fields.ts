// src/features/sales-control/schemas/fields.ts
// Campos zod reutilizados por los formularios del CV (el mismo zod valida formulario y action).
import { z } from "zod";

// REGLA: el TC se guarda como se ingresa, hasta 4 decimales (AGENTS.md §15.4); nunca como number.
export const fxRateField = z
  .string()
  .trim()
  .regex(
    /^\d{1,8}(\.\d{1,4})?$/,
    "Usa un número con hasta 4 decimales, p. ej. 6.96.",
  )
  .refine(
    (value) => /[1-9]/.test(value),
    "El tipo de cambio debe ser mayor que 0.",
  );

export const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const optionalDate = z.union([z.iso.date(), z.literal("")]);

export const optionalId = z.string().nullable();
