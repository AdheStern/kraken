// src/features/sales-control/schemas/withholdings-schema.ts
// GROSS UP y RET DIMA de las líneas, que Administración y las gerencias corrigen en cualquier estado (AGENTS.md §2.3,
// decisión 2026-11-16). Mismo formato que en el borrador.
import { z } from "zod";
import { cvLineDraftSchema } from "./cv-lines-schema";

const lineWithholdingsSchema = cvLineDraftSchema
  .pick({ grossUpUsd: true, retDimaUsd: true })
  .extend({ id: z.uuid() })
  .transform((line) => ({
    id: line.id,
    grossUpUsd: line.grossUpUsd || null,
    retDimaUsd: line.retDimaUsd || null,
  }));

export const updateCvWithholdingsSchema = z.object({
  versionId: z.uuid(),
  lines: z.array(lineWithholdingsSchema).max(1000),
});

export type UpdateCvWithholdingsInput = z.input<
  typeof updateCvWithholdingsSchema
>;
