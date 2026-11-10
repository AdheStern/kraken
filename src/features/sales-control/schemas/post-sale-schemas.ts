// src/features/sales-control/schemas/post-sale-schemas.ts
// Datos posventa de una versión APROBADA (AGENTS.md §2.3, decisión 2026-11-03): observaciones, PO#, BC, rango de
// activación y seriales de las líneas; notas, seriales y PO# del leasing. Mismos límites que el borrador.
import { z } from "zod";
import {
  cvLeasingLineDraftSchema,
  parseLeasingSerials,
  serialsIssue,
} from "./cv-leasing-schema";
import { cvLineDraftSchema } from "./cv-lines-schema";

const toDate = (text: string) => (text ? new Date(text) : null);

const postSaleLineSchema = cvLineDraftSchema
  .pick({
    poNumber: true,
    bc: true,
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
    bc: line.bc || null,
    activationStart: toDate(line.activationStart),
    activationEnd: toDate(line.activationEnd),
    serials: line.serials,
  }));

// POR QUÉ: la cantidad no viaja; el tope de seriales por cantidad se revisa en el servidor contra la línea guardada.
const postSaleLeasingSchema = cvLeasingLineDraftSchema
  .pick({ notes: true, poNumber: true, serials: true })
  .extend({ id: z.uuid() })
  .transform((line) => ({
    id: line.id,
    notes: line.notes || null,
    poNumber: line.poNumber || null,
    serials: parseLeasingSerials(line.serials),
  }))
  .superRefine((line, ctx) => {
    const issue = serialsIssue(line.serials, null);
    if (issue) ctx.addIssue({ code: "custom", message: `Leasing: ${issue}` });
  });

export const updatePostSaleDetailsSchema = z.object({
  versionId: z.uuid(),
  lines: z.array(postSaleLineSchema).max(1000).default([]),
  leasing: z.array(postSaleLeasingSchema).max(300).default([]),
});

export type UpdatePostSaleDetailsInput = z.input<
  typeof updatePostSaleDetailsSchema
>;
