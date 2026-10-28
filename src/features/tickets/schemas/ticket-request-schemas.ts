// src/features/tickets/schemas/ticket-request-schemas.ts
// Entradas de la solicitud de ticket y de su descarte; el mismo zod valida el formulario y la action (§2.6).
import { z } from "zod";

export const createTicketRequestSchema = z.object({
  areaId: z.uuid("Elige el área que debe atenderte."),
  title: z
    .string()
    .trim()
    .min(3, "Escribe un asunto (mínimo 3 caracteres).")
    .max(160, "El asunto admite hasta 160 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "Describe tu problema.")
    .max(4000, "La descripción admite hasta 4000 caracteres."),
});

export const discardTicketRequestSchema = z.object({
  requestId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Explica por qué se descarta (mínimo 3 caracteres).")
    .max(1000, "El motivo admite hasta 1000 caracteres."),
});

export type CreateTicketRequestInput = z.infer<
  typeof createTicketRequestSchema
>;
export type DiscardTicketRequestInput = z.infer<
  typeof discardTicketRequestSchema
>;
