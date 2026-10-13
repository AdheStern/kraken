// src/features/sales-control/schemas/cv-lines-schema.ts
// Borrador de líneas y lotes de una versión tal como lo edita la grilla (los números viajan como texto).
// La validación de montos y factor la hace priceLine con el dominio de precios.
import { z } from "zod";
import { ItemType, SupplyMode } from "@/generated/prisma/enums";

const optionalId = z.string().nullable();

export const cvGroupDraftSchema = z.object({
  key: z.string().min(1),
  id: z.string().nullable(),
  name: z.string().trim().min(1, "Cada lote necesita un nombre.").max(80),
});

export const cvLineDraftSchema = z.object({
  key: z.string().min(1),
  id: z.string().nullable(),
  kind: z.enum(["ITEM", "NOTA"]),
  groupKey: z.string().nullable(),
  areaId: optionalId,
  supplierId: optionalId,
  supplyMode: z.enum(SupplyMode).nullable(),
  technologyId: optionalId,
  itemType: z.enum(ItemType).nullable(),
  productId: optionalId,
  code: z.string().trim().max(80),
  description: z.string().trim().max(2000),
  unitId: optionalId,
  quantity: z.string(),
  unitCostUsd: z.string(),
  pricingSource: z.enum(["FACTOR", "PRECIO"]),
  factor: z.string(),
  unitSaleUsd: z.string(),
  poNumber: z.string().trim().max(60),
  notes: z.string().trim().max(1000),
});

export const upsertCvLinesSchema = z.object({
  versionId: z.uuid(),
  groups: z.array(cvGroupDraftSchema).max(100),
  lines: z.array(cvLineDraftSchema).max(1000),
});

export type CvGroupDraft = z.infer<typeof cvGroupDraftSchema>;
export type CvLineDraft = z.infer<typeof cvLineDraftSchema>;
export type UpsertCvLinesInput = z.infer<typeof upsertCvLinesSchema>;
