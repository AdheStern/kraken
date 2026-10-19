// src/features/tickets/schemas/ticket-close-schemas.ts
// Entradas del cierre y la reapertura de un ticket; el mismo zod valida el diálogo y la action.
import { z } from "zod";

export const closeTicketSchema = z.object({ ticketId: z.uuid() });

export type CloseTicketInput = z.infer<typeof closeTicketSchema>;
