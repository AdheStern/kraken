// src/features/sales-control/schemas/final-price-schema.ts
// Precio final del total de una versión de CV en USD y/o Bs, con motivo obligatorio; los dos vacíos lo quitan
// (AGENTS.md §2.3, decisión 2026-11-19). El mismo schema valida el diálogo y la action.
import { z } from "zod";

// POR QUÉ: los montos viajan como texto para no perder decimales; vacío = sin precio final en esa moneda.
const finalAmountText = z
  .string()
  .trim()
  .regex(
    /^(\d{1,16}(\.\d{1,2})?)?$/,
    "Escribe un monto mayor a 0, con hasta 2 decimales.",
  )
  .refine((value) => value === "" || Number(value) > 0, {
    message: "Escribe un monto mayor a 0, con hasta 2 decimales.",
  })
  .transform((value) => value || null);

export const setCvFinalPriceSchema = z.object({
  versionId: z.uuid(),
  finalSaleUsd: finalAmountText,
  finalSaleBs: finalAmountText,
  reason: z
    .string()
    .trim()
    .min(3, "Escribe el motivo del precio final.")
    .max(500, "El motivo admite hasta 500 caracteres."),
});

export type SetCvFinalPriceInput = z.input<typeof setCvFinalPriceSchema>;
