// src/features/documentation/actions/move-doc-phase.ts
// Sube o baja una fase en el orden en que se muestran en cada proyecto (AGENTS.md §2.10).
"use server";

import { reorderPhases } from "@/domain/documentation/reorder-phases";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageDocPhases } from "@/server/authz/documentation-permissions";
import { runUserAction } from "@/server/run-user-action";
import {
  type MoveDocPhaseInput,
  moveDocPhaseSchema,
} from "../schemas/doc-phase-schemas";

export async function moveDocPhase(
  input: MoveDocPhaseInput,
): Promise<ActionResult<null>> {
  const parsed = moveDocPhaseSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, direction } = parsed.data;
  return runUserAction("moveDocPhase", async (tx, user) => {
    if (!canManageDocPhases(user))
      return actionError(
        "FORBIDDEN",
        "Solo el administrador del sistema edita las fases.",
      );
    const phases = await tx.docPhase.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    const reordered = reorderPhases(phases, id, direction);
    if (!reordered)
      return actionError("INVALID_STATE", "Solo se ordenan las fases activas.");
    // POR QUÉ: se reescribe el orden completo; dos fases con el mismo orden no se podrían intercambiar.
    for (const [position, phaseId] of reordered.entries())
      await tx.docPhase.update({
        where: { id: phaseId },
        data: { order: position + 1 },
      });
    await recordAudit(tx, {
      actorId: user.id,
      entity: "doc.fase",
      entityId: id,
      action: "ORDENAR",
      before: { order: phases.findIndex((p) => p.id === id) + 1 },
      after: { order: reordered.indexOf(id) + 1 },
    });
    return actionOk(null);
  });
}
