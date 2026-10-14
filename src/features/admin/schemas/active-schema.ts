// src/features/admin/schemas/active-schema.ts
// Baja lógica o reactivación de un registro de catálogo (AGENTS.md §4: borrado lógico solo en catálogos).
import { z } from "zod";

export const activeSchema = z.object({ id: z.uuid(), isActive: z.boolean() });

export type ActiveInput = z.input<typeof activeSchema>;
