// src/features/tickets/schemas/conformity-schema.ts
// Respuesta de conformidad del cliente (§2.11, decisión 2026-11-05): conforme con nota de 1 a 5, o no conforme
// con el motivo, que es obligatorio.
import { z } from "zod";

export const conformitySchema = z.discriminatedUnion("isSatisfied", [
  z.object({
    ticketId: z.uuid(),
    isSatisfied: z.literal(true),
    rating: z
      .number()
      .int()
      .min(1, "Elige de 1 a 5 estrellas.")
      .max(5, "Elige de 1 a 5 estrellas."),
  }),
  z.object({
    ticketId: z.uuid(),
    isSatisfied: z.literal(false),
    comment: z
      .string()
      .trim()
      .min(1, "Cuéntanos qué falta para que quedes conforme.")
      .max(4000),
  }),
]);

export type ConformityInput = z.input<typeof conformitySchema>;
