// src/features/documentation/actions/set-doc-phase-active.ts
// Da de baja o reactiva una fase de documentación (borrado lógico de catálogo, AGENTS.md §4).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageDocPhases } from "@/server/authz/documentation-permissions";
import { runUserAction } from "@/server/run-user-action";
import {
  type DocPhaseActiveInput,
  docPhaseActiveSchema,
} from "../schemas/doc-phase-schemas";

// POR QUÉ: una fase dada de baja no admite subidas, pero sus documentos se siguen viendo (§2.10).
export async function setDocPhaseActive(
  input: DocPhaseActiveInput,
): Promise<ActionResult<null>> {
  const parsed = docPhaseActiveSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, isActive } = parsed.data;
  return runUserAction("setDocPhaseActive", async (tx, user) => {
    if (!canManageDocPhases(user))
      return actionError(
        "FORBIDDEN",
        "Solo el administrador del sistema edita las fases.",
      );
    await tx.docPhase.update({ where: { id }, data: { isActive } });
    await recordAudit(tx, {
      actorId: user.id,
      entity: "doc.fase",
      entityId: id,
      action: isActive ? "REACTIVAR" : "BAJA",
      before: { isActive: !isActive },
      after: { isActive },
    });
    return actionOk(null);
  });
}
