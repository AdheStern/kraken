// src/features/documentation/schemas/doc-phase-schemas.ts
// Entradas del catálogo de fases de documentación (AGENTS.md §2.10); el mismo zod valida formulario y action.
import { z } from "zod";

export const docPhaseSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(2, "Escribe un nombre.").max(80),
});

export type DocPhaseInput = z.input<typeof docPhaseSchema>;

export const docPhaseActiveSchema = z.object({
  id: z.uuid(),
  isActive: z.boolean(),
});

export type DocPhaseActiveInput = z.input<typeof docPhaseActiveSchema>;

export const moveDocPhaseSchema = z.object({
  id: z.uuid(),
  direction: z.enum(["up", "down"]),
});

export type MoveDocPhaseInput = z.input<typeof moveDocPhaseSchema>;
