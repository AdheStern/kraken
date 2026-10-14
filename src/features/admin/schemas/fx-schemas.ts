// src/features/admin/schemas/fx-schemas.ts
// Carga manual del TC oficial cuando el job no lo obtuvo (AGENTS.md §2.2, §7 setManualFxRate).
import Decimal from "decimal.js";
import { z } from "zod";

// REGLA: el TC se guarda como se ingresa, con hasta 4 decimales (AGENTS.md §15.4).
const rate = (label: string) =>
  z
    .string()
    .trim()
    .regex(
      /^\d{1,4}(\.\d{1,4})?$/,
      `Escribe el TC de ${label} con hasta 4 decimales, como 6.96.`,
    )
    .refine(
      (v) => new Decimal(v).gt(0),
      `El TC de ${label} debe ser mayor a 0.`,
    );

export const manualFxRateSchema = z
  .object({
    effectiveOn: z.iso.date("Elige la fecha desde la que rige."),
    buyRate: rate("compra"),
    sellRate: rate("venta"),
  })
  .refine((v) => new Decimal(v.buyRate).lte(v.sellRate), {
    message:
      "La compra no puede ser mayor que la venta (el BCB publica 6.86 y 6.96).",
    path: ["buyRate"],
  });

export type ManualFxRateInput = z.input<typeof manualFxRateSchema>;
