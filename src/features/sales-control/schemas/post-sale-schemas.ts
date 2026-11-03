// src/features/sales-control/schemas/post-sale-schemas.ts
// Datos posventa de una versión APROBADA (AGENTS.md §2.3, decisión 2026-11-03): observaciones, PO#, rango de
// activación y seriales de las líneas; notas y PO# del leasing. Mismos límites que el borrador.
import { z } from "zod";
import { cvLeasingLineDraftSchema } from "./cv-leasing-schema";
import { cvLineDraftSchema } from "./cv-lines-schema";

const toDate = (text: string) => (text ? new Date(text) : null);

const postSaleLineSchema = cvLineDraftSchema
  .pick({
    poNumber: true,
    notes: true,
    serials: true,
    activationStart: true,
    activationEnd: true,
  })
  .extend({ id: z.uuid() })
  .superRefine((line, ctx) => {
    const hasStart = line.activationStart !== "";
    if (hasStart !== (line.activationEnd !== ""))
      ctx.addIssue({
        code: "custom",
        message: "El rango de activación lleva inicio y fin.",
      });
    else if (hasStart && line.activationEnd < line.activationStart)
      ctx.addIssue({
        code: "custom",
        message: "El fin de la activación no puede ser anterior al inicio.",
      });
  })
  .transform((line) => ({
    id: line.id,
    notes: line.notes || null,
    poNumber: line.poNumber || null,
    activationStart: toDate(line.activationStart),
    activationEnd: toDate(line.activationEnd),
    serials: line.serials,
  }));

const postSaleLeasingSchema = cvLeasingLineDraftSchema
  .pick({ notes: true, poNumber: true })
  .extend({ id: z.uuid() })
  .transform((line) => ({
    id: line.id,
    notes: line.notes || null,
    poNumber: line.poNumber || null,
  }));

export const updatePostSaleDetailsSchema = z.object({
  versionId: z.uuid(),
  lines: z.array(postSaleLineSchema).max(1000).default([]),
  leasing: z.array(postSaleLeasingSchema).max(300).default([]),
});

export type UpdatePostSaleDetailsInput = z.input<
  typeof updatePostSaleDetailsSchema
>;
