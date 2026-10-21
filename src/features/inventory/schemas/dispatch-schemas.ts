// src/features/inventory/schemas/dispatch-schemas.ts
// Salida (POS) y devolución de inventario (AGENTS.md §2.8): destino, líneas con cantidad y seriales, y la clave
// que impide registrar dos veces el mismo comprobante.
import { z } from "zod";

const quantity = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "La cantidad es un número con hasta 2 decimales.")
  .refine((v) => Number(v) > 0, "La cantidad es mayor a 0.");

const notes = z
  .string()
  .trim()
  .max(300, "Las notas son muy largas; usa hasta 300 caracteres.")
  .transform((v) => v || null);

export const dispatchSchema = z.object({
  warehouseId: z.uuid("Elige el almacén."),
  destination: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("CV"), reservationId: z.uuid() }),
    z.object({ kind: z.literal("TICKET"), ticketId: z.uuid() }),
    z.object({
      kind: z.literal("INTERNO"),
      reason: z
        .string()
        .trim()
        .min(5, "Explica para qué es el uso interno (mínimo 5 caracteres).")
        .max(200, "El motivo es muy largo; usa hasta 200 caracteres."),
    }),
  ]),
  notes,
  idempotencyKey: z.uuid(),
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity,
        serials: z.array(z.string().trim().min(1).max(80)).max(500),
      }),
    )
    .min(1, "Agrega al menos un producto.")
    .max(200, "Despacha hasta 200 productos por comprobante."),
});

export type DispatchFormInput = z.input<typeof dispatchSchema>;

export const returnSchema = z.object({
  movementId: z.uuid(),
  lines: z
    .array(z.object({ lineId: z.uuid(), quantity }))
    .min(1, "Elige qué vuelve al almacén."),
  notes,
  idempotencyKey: z.uuid(),
});

export type ReturnFormInput = z.input<typeof returnSchema>;
