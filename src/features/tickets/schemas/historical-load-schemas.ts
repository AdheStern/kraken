// src/features/tickets/schemas/historical-load-schemas.ts
// Forma de las filas que envía la grilla de carga histórica de tickets; las reglas de negocio las valida
// parseHistoricalRows (AGENTS.md §2.6, decisión 2026-11-19).
import { z } from "zod";

export const MAX_HISTORICAL_ROWS = 300;
export const MAX_HISTORICAL_TICKETS = 100;

const cell = z.string().max(4000);

export const historicalRowSchema = z.object({
  ref: z.string().trim().max(60),
  openedOn: cell,
  title: cell,
  description: cell,
  customerId: cell,
  cityId: cell,
  areaIds: z.array(z.uuid()).max(10),
  projectId: cell,
  priority: cell,
  ownerId: cell,
  status: cell,
  workDate: cell,
  from: cell,
  to: cell,
  executorId: cell,
  bagId: cell,
  closedOn: cell,
});

export const importHistoricalSchema = z.object({
  rows: z
    .array(historicalRowSchema)
    .min(1, "Agrega al menos una fila.")
    .max(
      MAX_HISTORICAL_ROWS,
      `Carga hasta ${MAX_HISTORICAL_ROWS} filas por vez.`,
    ),
});

export type ImportHistoricalInput = z.infer<typeof importHistoricalSchema>;
