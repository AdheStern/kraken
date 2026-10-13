// src/server/hours/read-bag-spec.ts
// Lee la especificación de bolsa guardada en cv.linea (JSON) como BagSpec del dominio (AGENTS.md §2.1, §2.4).
import { z } from "zod";
import type { BagSpec } from "@/domain/hours/plan-version-bags";
import { BagModality, BagScope } from "@/generated/prisma/enums";

const storedSpecSchema = z.object({
  modality: z.enum(BagModality),
  scope: z.enum(BagScope),
  areaIds: z.array(z.string()),
  projectId: z.string().nullable(),
  expiresOn: z.union([z.iso.date(), z.literal(""), z.null()]),
});

// POR QUÉ: el JSON puede venir de una versión vieja o incompleta; si no valida, la línea no puede abrir bolsa.
export function readBagSpec(value: unknown): BagSpec | null {
  const parsed = storedSpecSchema.safeParse(value);
  if (!parsed.success) return null;
  return { ...parsed.data, expiresOn: parsed.data.expiresOn || null };
}
