// src/features/tickets/actions/apply-pending-hours.ts
// Aplica las horas de un ticket que quedaron sin bolsa a una bolsa del cliente (AGENTS.md §2.6 paso 5).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { applyPendingHoursRecord } from "@/server/tickets/apply-pending-hours-record";
import {
  type ApplyPendingHoursInput,
  applyPendingHoursSchema,
} from "../schemas/ticket-work-schemas";

export async function applyPendingHours(
  input: ApplyPendingHoursInput,
): Promise<ActionResult<{ minutes: number }>> {
  const parsed = applyPendingHoursSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("applyPendingHours", async (tx, user) => {
    const result = await applyPendingHoursRecord(
      tx,
      user,
      parsed.data,
      new Date(),
    );
    if (result.ok)
      await recordAudit(tx, {
        actorId: user.id,
        entity: "horas.pendiente_sin_bolsa",
        entityId: parsed.data.pendingId,
        action: "APLICAR",
        after: { bagId: parsed.data.bagId, minutes: result.data.minutes },
      });
    return result;
  });
}
