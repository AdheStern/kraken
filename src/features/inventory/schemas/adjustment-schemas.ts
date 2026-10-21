// src/features/inventory/schemas/adjustment-schemas.ts
// Pedir y decidir un ajuste de inventario (AGENTS.md §2.8): las líneas usan la forma que guarda el servidor.
import { z } from "zod";
import { adjustmentLinesSchema } from "@/server/inventory/adjustments/adjustment-lines";

export const adjustmentRequestSchema = z.object({
  warehouseId: z.uuid("Elige el almacén."),
  areaId: z.uuid().nullable(),
  origin: z.enum(["MANUAL", "CONTEO", "TRASPASO"]),
  reason: z
    .string()
    .trim()
    .min(5, "Explica el motivo del ajuste (mínimo 5 caracteres).")
    .max(300, "El motivo es muy largo; usa hasta 300 caracteres."),
  lines: adjustmentLinesSchema,
});

export type AdjustmentRequestFormInput = z.input<
  typeof adjustmentRequestSchema
>;

export const adjustmentDecisionSchema = z.object({
  requestId: z.uuid(),
  approve: z.boolean(),
  comment: z
    .string()
    .trim()
    .max(300, "El comentario es muy largo; usa hasta 300 caracteres."),
});

export type AdjustmentDecisionFormInput = z.input<
  typeof adjustmentDecisionSchema
>;
