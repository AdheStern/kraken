// src/features/tickets/schemas/ticket-schemas.ts
// Entradas de alta de ticket, encargado, estado y comentarios; el mismo zod valida el formulario y la action.
import { z } from "zod";

const userId = z.string().trim().min(1, "Elige una persona.");

export const createTicketSchema = z.object({
  kind: z.enum(["SOPORTE", "PROYECTO"]),
  customerId: z.uuid("Elige el cliente."),
  cityId: z.uuid("Elige la ciudad."),
  areaIds: z.array(z.uuid()).min(1, "Elige al menos un área."),
  projectId: z.uuid().nullable(),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
  slaModality: z.enum(["H8X5", "H24X7"]),
  title: z
    .string()
    .trim()
    .min(3, "Escribe un título (mínimo 3 caracteres).")
    .max(160, "El título admite hasta 160 caracteres."),
  description: z
    .string()
    .trim()
    .min(1, "Describe el pedido del cliente.")
    .max(4000, "La descripción admite hasta 4000 caracteres."),
  ownerId: userId.nullable(),
});

export const assignOwnerSchema = z.object({
  ticketId: z.uuid(),
  ownerId: userId,
});

// POR QUÉ: CERRADO y la reapertura tienen sus propias actions (descuento y reverso de horas).
export const changeTicketStatusSchema = z.object({
  ticketId: z.uuid(),
  to: z.enum(["EN_PROGRESO", "EN_ESPERA_CLIENTE", "RESUELTO", "CANCELADO"]),
});

export const addCommentSchema = z.object({
  ticketId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Escribe el comentario.")
    .max(4000, "El comentario admite hasta 4000 caracteres."),
  isPublic: z.boolean(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AssignOwnerInput = z.infer<typeof assignOwnerSchema>;
export type ChangeTicketStatusInput = z.infer<typeof changeTicketStatusSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
