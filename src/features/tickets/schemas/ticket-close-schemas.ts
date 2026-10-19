// src/features/tickets/schemas/ticket-close-schemas.ts
// Entradas del cierre y la reapertura de un ticket; el mismo zod valida el diálogo y la action.
import { z } from "zod";

export const closeTicketSchema = z.object({ ticketId: z.uuid() });

export const reopenTicketSchema = z.object({
  ticketId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(5, "Explica por qué se reabre (mínimo 5 caracteres).")
    .max(300, "El motivo admite hasta 300 caracteres."),
});

export type CloseTicketInput = z.infer<typeof closeTicketSchema>;
export type ReopenTicketInput = z.infer<typeof reopenTicketSchema>;
