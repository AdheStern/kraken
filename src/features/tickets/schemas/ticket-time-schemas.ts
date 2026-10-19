// src/features/tickets/schemas/ticket-time-schemas.ts
// Entradas del contador y de los registros manuales de tiempo; el mismo zod valida el formulario y la action.
import { z } from "zod";

export const startTimerSchema = z.object({
  ticketId: z.uuid(),
  subtaskId: z.uuid().nullable(),
});

export const timerSchema = z.object({ timerId: z.uuid() });

// POR QUÉ: llegan como ISO con zona desde el formulario (hora de La Paz convertida en el navegador).
export const manualTimeEntrySchema = z.object({
  ticketId: z.uuid(),
  subtaskId: z.uuid().nullable(),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }),
});

export const deleteTimeEntrySchema = z.object({ entryId: z.uuid() });

export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type TimerInput = z.infer<typeof timerSchema>;
export type ManualTimeEntryInput = z.infer<typeof manualTimeEntrySchema>;
export type DeleteTimeEntryInput = z.infer<typeof deleteTimeEntrySchema>;
