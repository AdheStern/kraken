// src/features/tickets/schemas/ticket-work-schemas.ts
// Entradas de subtareas, jerarquía de bolsas, proyectos y aplicación del pendiente sin bolsa; el mismo zod
// valida el formulario y la action.
import { z } from "zod";

const title = z
  .string()
  .trim()
  .min(3, "Escribe un título (mínimo 3 caracteres).")
  .max(160, "El título admite hasta 160 caracteres.");

export const createSubtaskSchema = z.object({
  ticketId: z.uuid(),
  title,
  assigneeId: z.string().trim().min(1).nullable(),
});

export const updateSubtaskSchema = z.object({
  subtaskId: z.uuid(),
  assigneeId: z.string().trim().min(1).nullable().optional(),
  status: z
    .enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"])
    .optional(),
});

export const setTicketBagsSchema = z.object({
  ticketId: z.uuid(),
  bagIds: z
    .array(z.uuid())
    .max(10, "Un ticket usa hasta 10 bolsas.")
    .refine((ids) => new Set(ids).size === ids.length, "Hay bolsas repetidas."),
});

export const createProjectSchema = z.object({
  name: title,
  customerId: z.uuid("Elige el cliente."),
  areaIds: z.array(z.uuid()).min(1, "Elige al menos un área."),
  startsOn: z.iso.date().nullable(),
  endsOn: z.iso.date().nullable(),
});

export const applyPendingHoursSchema = z.object({
  pendingId: z.uuid(),
  bagId: z.uuid("Elige la bolsa."),
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
export type SetTicketBagsInput = z.infer<typeof setTicketBagsSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ApplyPendingHoursInput = z.infer<typeof applyPendingHoursSchema>;
