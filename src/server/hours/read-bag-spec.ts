// src/server/hours/read-bag-spec.ts
// Lee la especificación de bolsa guardada en cv.linea (JSON) como BagSpec del dominio, con el tope en horas de
// un contrato por vigencia (AGENTS.md §2.1, §2.4).
import { z } from "zod";
import type { BagSpec } from "@/domain/hours/plan-version-bags";
import { BagKind, BagModality, BagScope } from "@/generated/prisma/enums";

// POR QUÉ: los JSON anteriores a los contratos por vigencia no traen kind ni capHours; valen como HORAS.
const storedSpecSchema = z.object({
  kind: z.enum(BagKind).default("HORAS"),
  capHours: z.string().nullable().default(null),
  modality: z.enum(BagModality),
  scope: z.enum(BagScope),
  areaIds: z.array(z.string()),
  projectId: z.string().nullable(),
  expiresOn: z.union([z.iso.date(), z.literal(""), z.null()]).default(null),
});

export type StoredBagSpec = BagSpec & { capHours: string | null };

// POR QUÉ: el JSON puede venir de una versión vieja o incompleta; si no valida, la línea no puede abrir bolsa.
export function readBagSpec(value: unknown): StoredBagSpec | null {
  const parsed = storedSpecSchema.safeParse(value);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    expiresOn: parsed.data.expiresOn || null,
    startsOn: null,
    isUncapped: false,
  };
}
