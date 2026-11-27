// src/features/sales-control/schemas/activation-schema.ts
// Rango de activación de las licencias, que se completa en cualquier estado del CV (AGENTS.md §2.3, decisión
// 2026-11-27). La misma validación del rango la usan los datos posventa.
import { z } from "zod";
import { cvLineDraftSchema } from "./cv-lines-schema";

type ActivationText = { activationStart: string; activationEnd: string };

export function activationRangeIssue(line: ActivationText): string | null {
  const hasStart = line.activationStart !== "";
  if (hasStart !== (line.activationEnd !== ""))
    return "El rango de activación lleva inicio y fin.";
  if (hasStart && line.activationEnd < line.activationStart)
    return "El fin de la activación no puede ser anterior al inicio.";
  return null;
}

export const toActivationDate = (text: string) =>
  text ? new Date(text) : null;

const lineActivationSchema = cvLineDraftSchema
  .pick({ activationStart: true, activationEnd: true })
  .extend({ id: z.uuid() })
  .superRefine((line, ctx) => {
    const issue = activationRangeIssue(line);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  })
  .transform((line) => ({
    id: line.id,
    activationStart: toActivationDate(line.activationStart),
    activationEnd: toActivationDate(line.activationEnd),
  }));

export const updateCvActivationSchema = z.object({
  versionId: z.uuid(),
  lines: z.array(lineActivationSchema).max(1000),
});

export type UpdateCvActivationInput = z.input<typeof updateCvActivationSchema>;
