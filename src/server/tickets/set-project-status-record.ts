// src/server/tickets/set-project-status-record.ts
// Cierra o reactiva un proyecto; uno cerrado no recibe tickets nuevos ni se elige en las bolsas de un CV
// (AGENTS.md §2.6 estructura).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCreateTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";

type Change = { projectId: string; status: "ACTIVO" | "CERRADO" };

export async function setProjectStatusRecord(
  tx: Tx,
  user: SessionUser,
  { projectId, status }: Change,
): Promise<ActionResult<Change>> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { areas: { select: { areaId: true } } },
  });
  if (!project) return actionError("NOT_FOUND", "El proyecto ya no existe.");
  if (!canCreateTicket(user, { areaIds: project.areas.map((a) => a.areaId) }))
    return actionError(
      "FORBIDDEN",
      "Solo el coordinador o el gerente de un área del proyecto, o el GG, lo cierran o reactivan.",
    );
  await tx.project.update({ where: { id: projectId }, data: { status } });
  return actionOk({ projectId, status });
}
