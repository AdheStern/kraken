// src/features/inventory/actions/decide-adjustment.ts
// Aprueba o rechaza un ajuste de inventario (AGENTS.md §2.8, §7 decideAdjustment): el gerente del área de la
// solicitud, Administración o el GG, nunca quien la pidió (§2.9). Queda en la auditoría.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canDecideAdjustment } from "@/server/authz/inventory-permissions";
import { decideAdjustment as decide } from "@/server/inventory/adjustments/decide-adjustment";
import { runUserAction } from "@/server/run-user-action";
import {
  type AdjustmentDecisionFormInput,
  adjustmentDecisionSchema,
} from "../schemas/adjustment-schemas";

export async function decideAdjustment(
  input: AdjustmentDecisionFormInput,
): Promise<ActionResult<null>> {
  return runUserAction("decideAdjustment", async (tx, user) => {
    const parsed = adjustmentDecisionSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const request = await tx.adjustmentRequest.findUnique({
      where: { id: parsed.data.requestId },
      select: { areaId: true, requestedById: true, status: true },
    });
    if (!request) return actionError("NOT_FOUND", "La solicitud ya no existe.");
    if (!canDecideAdjustment(user, request))
      return actionError(
        "FORBIDDEN",
        request.requestedById === user.id
          ? "No puedes decidir un ajuste que pediste tú."
          : "Lo decide el gerente del área, Administración o el GG.",
      );
    await decide(tx, user.id, parsed.data);
    await recordAudit(tx, {
      actorId: user.id,
      entity: "inv.solicitud_ajuste",
      entityId: parsed.data.requestId,
      action: parsed.data.approve ? "APROBAR" : "RECHAZAR",
      before: { status: request.status },
      after: {
        status: parsed.data.approve ? "APROBADO" : "RECHAZADO",
        comment: parsed.data.comment,
      },
    });
    return actionOk(null);
  });
}
