// src/features/admin/schemas/product-schemas.ts
// Entrada del catálogo de productos (el mismo de los CV y del inventario, AGENTS.md §2.1 y §2.8).
import { z } from "zod";

export const ITEM_TYPES = ["HARDWARE", "INTANGIBLE", "SERVICIO"] as const;

const optionalId = z
  .string()
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

export const productSchema = z.object({
  id: z.uuid().nullable(),
  code: z.string().trim().min(1, "Escribe el código del producto.").max(60),
  description: z
    .string()
    .trim()
    .min(2, "Escribe la descripción del producto.")
    .max(300),
  technologyId: optionalId,
  unitId: optionalId,
  itemType: z.enum(
    ITEM_TYPES,
    "Elige el tipo: hardware, intangible o servicio.",
  ),
  isSerialized: z.boolean(),
});

export type ProductInput = z.input<typeof productSchema>;

export const productReviewSchema = z.object({ id: z.uuid() });

export type ProductReviewInput = z.input<typeof productReviewSchema>;
