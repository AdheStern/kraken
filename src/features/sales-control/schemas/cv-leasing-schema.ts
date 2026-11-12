// src/features/sales-control/schemas/cv-leasing-schema.ts
// Líneas de leasing o arrendamiento de una versión (AGENTS.md §2.1): solo costo, no afectan la venta. Los seriales
// se escriben en la misma fila, separados por coma, y se guardan como lista.
import { z } from "zod";
import { parseSerials } from "../parse-serials";

const AMOUNT = /^\d+(\.\d{1,2})?$/;
export const parseLeasingSerials = parseSerials;

export function serialsIssue(
  serials: string[],
  quantity: string | null,
): string | null {
  if (serials.some((serial) => serial.length > 80))
    return "cada serial tiene hasta 80 caracteres.";
  if (new Set(serials).size !== serials.length)
    return "hay seriales repetidos.";
  const amount = quantity === null ? Number.NaN : Number(quantity.trim());
  if (Number.isFinite(amount) && serials.length > amount)
    return "hay más seriales que la cantidad.";
  return null;
}

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
  serials: z.string().max(20000),
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
        const issue = serialsIssue(
          parseLeasingSerials(line.serials),
          line.quantity,
        );
        if (issue) ctx.addIssue({ code: "custom", message: issue });
      }),
    )
    .max(300),
});

export type CvLeasingLineDraft = z.infer<typeof cvLeasingLineDraftSchema>;
export type UpsertCvLeasingInput = z.infer<typeof upsertCvLeasingSchema>;
