// src/features/sales-control/schemas/cv-leasing-schema.ts
// Líneas de leasing o arrendamiento de una versión (AGENTS.md §2.1): solo costo, no afectan la venta.
import { z } from "zod";

const AMOUNT = /^\d+(\.\d{1,2})?$/;

export const cvLeasingLineDraftSchema = z.object({
  key: z.string().min(1),
  id: z.string().nullable(),
  supplierId: z.string().nullable(),
  technologyId: z.string().nullable(),
  code: z.string().trim().max(80),
  description: z.string().trim().max(2000),
  quantity: z.string(),
  unitCostUsd: z.string(),
  notes: z.string().trim().max(1000),
  poNumber: z.string().trim().max(60),
});

export const upsertCvLeasingSchema = z.object({
  versionId: z.uuid(),
  lines: z
    .array(
      cvLeasingLineDraftSchema.superRefine((line, ctx) => {
        if (line.description === "")
          ctx.addIssue({ code: "custom", message: "escribe la descripción." });
        if (
          !AMOUNT.test(line.quantity.trim()) ||
          !/[1-9]/.test(line.quantity)
        ) {
          ctx.addIssue({
            code: "custom",
            message: "cantidad mayor que 0 con hasta 2 decimales.",
          });
        }
        if (!AMOUNT.test(line.unitCostUsd.trim())) {
          ctx.addIssue({
            code: "custom",
            message: "costo de 0 o más con hasta 2 decimales.",
          });
        }
      }),
    )
    .max(300),
});

export type CvLeasingLineDraft = z.infer<typeof cvLeasingLineDraftSchema>;
export type UpsertCvLeasingInput = z.infer<typeof upsertCvLeasingSchema>;
