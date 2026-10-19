// src/features/sla/schemas/sla-policy-schema.ts
// Entrada de una política de SLA: horas de primera respuesta y de resolución por modalidad y prioridad; el
// mismo zod valida la fila de la grilla y la action (AGENTS.md §2.7).
import { z } from "zod";

const hours = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Escribe las horas como 4 o 0.5.");

export const slaPolicySchema = z.object({
  modality: z.enum(["H8X5", "H24X7"]),
  priority: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
  firstResponseHours: hours,
  resolutionHours: hours,
  isActive: z.boolean(),
});

export type SlaPolicyInput = z.infer<typeof slaPolicySchema>;
