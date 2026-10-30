// src/features/sales-control/schemas/cv-lines-schema.ts
// Borrador de líneas y lotes de una versión tal como lo edita la grilla (los números viajan como texto).
// La validación de montos y factor la hace priceLine con el dominio de precios.
import { z } from "zod";
import {
  BagKind,
  BagModality,
  BagScope,
  ItemType,
  SupplyMode,
} from "@/generated/prisma/enums";

const optionalId = z.string().nullable();
const dateText = z.union([z.iso.date(), z.literal("")]);

// REGLA: una línea de HORAS + SERVICIO genera una bolsa al aprobarse; aquí se captura su especificación (§2.4).
export const hourBagSpecSchema = z.object({
  // POR QUÉ: VIGENCIA es un contrato por meses o años (§2.4); los JSON anteriores no traen kind y valen como HORAS.
  kind: z.enum(BagKind).default("HORAS"),
  // POR QUÉ: tope en horas de un contrato por vigencia; null = sin tope.
  capHours: z.string().trim().nullable().default(null),
  modality: z.enum(BagModality),
  scope: z.enum(BagScope),
  areaIds: z.array(z.string()).max(10),
  projectId: z.string().nullable(),
  expiresOn: dateText,
});

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
  color: z
    .string()
    .regex(/^[0-9A-F]{6}$/, "Elige un color de la paleta.")
    .nullable(),
  serials: z.array(z.string().trim().min(1).max(80)).max(1000),
  coverageStart: dateText,
  coverageEnd: dateText,
  hourBag: hourBagSpecSchema.nullable(),
  saveAsProduct: z.boolean(),
});

export const upsertCvLinesSchema = z.object({
  versionId: z.uuid(),
  groups: z.array(cvGroupDraftSchema).max(100),
  lines: z.array(cvLineDraftSchema).max(1000),
});

export type CvGroupDraft = z.infer<typeof cvGroupDraftSchema>;
export type CvLineDraft = z.infer<typeof cvLineDraftSchema>;
export type HourBagSpec = z.infer<typeof hourBagSpecSchema>;
export type UpsertCvLinesInput = z.infer<typeof upsertCvLinesSchema>;
