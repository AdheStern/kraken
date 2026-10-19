// src/features/sla/actions/upsert-sla-policy.ts
// Guarda la política de SLA de una modalidad y prioridad (AGENTS.md §2.7); rige para los recálculos desde
// ahora. Solo el administrador del sistema.
"use server";

import Decimal from "decimal.js";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { runUserAction } from "@/server/run-user-action";
import {
  type SlaPolicyInput,
  slaPolicySchema,
} from "../schemas/sla-policy-schema";

export async function upsertSlaPolicy(
  input: SlaPolicyInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = slaPolicySchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { modality, priority, isActive } = parsed.data;
  const firstResponseMinutes = toBagMinutes(
    new Decimal(parsed.data.firstResponseHours),
  );
  const resolutionMinutes = toBagMinutes(
    new Decimal(parsed.data.resolutionHours),
  );
  if (!firstResponseMinutes || !resolutionMinutes)
    return actionError(
      "VALIDATION",
      "Las horas deben ser mayores que 0 y dar minutos enteros.",
    );
  if (resolutionMinutes < firstResponseMinutes)
    return actionError(
      "VALIDATION",
      "La resolución no puede ser menor que la primera respuesta.",
    );
  return runUserAction("upsertSlaPolicy", async (tx, user) => {
    if (!canManageSystem(user))
      return actionError(
        "FORBIDDEN",
        "Solo el administrador del sistema edita los SLA.",
      );
    const values = { firstResponseMinutes, resolutionMinutes, isActive };
    const saved = await tx.slaPolicy.upsert({
      where: { modality_priority: { modality, priority } },
      create: { modality, priority, ...values },
      update: values,
      select: { id: true },
    });
    await recordAudit(tx, {
      actorId: user.id,
      entity: "tickets.sla_politica",
      entityId: saved.id,
      action: "GUARDAR",
      after: { modality, priority, ...values },
    });
    return actionOk(saved);
  });
}
