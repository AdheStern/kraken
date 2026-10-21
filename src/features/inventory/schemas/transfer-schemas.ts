// src/features/inventory/schemas/transfer-schemas.ts
// Traspaso entre almacenes (AGENTS.md §2.8): alta en borrador con sus líneas y seriales, y la recepción por línea.
import { z } from "zod";

const quantity = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "La cantidad es un número con hasta 2 decimales.")
  .refine((v) => Number(v) > 0, "La cantidad es mayor a 0.");

export const transferDraftSchema = z.object({
  originWarehouseId: z.uuid("Elige el almacén de origen."),
  destinationWarehouseId: z.uuid("Elige el almacén de destino."),
  notes: z
    .string()
    .trim()
    .max(300, "Las notas son muy largas; usa hasta 300 caracteres.")
    .transform((v) => v || null),
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity,
        serials: z.array(z.string().trim().min(1).max(80)).max(500),
      }),
    )
    .min(1, "Agrega al menos un producto al traspaso.")
    .max(200, "Traspasa hasta 200 productos a la vez."),
});

export type TransferDraftFormInput = z.input<typeof transferDraftSchema>;

export const transferIdSchema = z.object({ transferId: z.uuid() });

export const transferReceiptSchema = z.object({
  transferId: z.uuid(),
  receipts: z
    .array(z.object({ transferLineId: z.uuid(), quantity }))
    .min(1, "Indica qué llegó."),
});

export type TransferReceiptFormInput = z.input<typeof transferReceiptSchema>;
