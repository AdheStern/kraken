// src/features/sales-control/schemas/version-schemas.ts
// Entradas de las acciones del ciclo de versiones y aprobación (AGENTS.md §2.3).
import { z } from "zod";

export const submitCvVersionSchema = z.object({ versionId: z.uuid() });

export const decideApprovalSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["APROBADA", "RECHAZADA"]),
  comment: z.string().trim().max(1000, "Máximo 1000 caracteres."),
});

export const versionReasonSchema = z.object({
  cvId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(5, "Explica el motivo (mínimo 5 caracteres).")
    .max(500, "Máximo 500 caracteres."),
});

export type SubmitCvVersionInput = z.infer<typeof submitCvVersionSchema>;
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
export type VersionReasonInput = z.infer<typeof versionReasonSchema>;
