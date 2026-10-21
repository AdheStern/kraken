// src/features/inventory/schemas/warehouse-schemas.ts
// Alta y edición de almacenes (AGENTS.md §2.8): el código y el tipo se fijan al crear; un almacén físico exige
// ciudad. TRANSITO no se crea a mano: lo siembra db:seed:base y es único.
import { z } from "zod";

export const CREATABLE_WAREHOUSE_KINDS = [
  "FISICO",
  "DEMOSTRACION",
  "REPUESTOS",
] as const;

export const warehouseSchema = z
  .object({
    id: z.uuid().nullable(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z0-9-]{2,12}$/,
        "El código lleva de 2 a 12 letras, números o guiones.",
      )
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, "Escribe el nombre del almacén.")
      .max(80, "El nombre es muy largo; usa hasta 80 caracteres."),
    kind: z.enum(CREATABLE_WAREHOUSE_KINDS).optional(),
    cityId: z.uuid().nullable(),
  })
  .refine((v) => v.id !== null || (v.code && v.kind), {
    message: "Indica el código y el tipo del almacén nuevo.",
  })
  .refine((v) => v.kind !== "FISICO" || v.cityId !== null, {
    message: "Un almacén físico necesita su ciudad.",
  });

export type WarehouseInput = z.input<typeof warehouseSchema>;

export const warehouseActiveSchema = z.object({
  id: z.uuid(),
  isActive: z.boolean(),
});

export type WarehouseActiveInput = z.input<typeof warehouseActiveSchema>;
