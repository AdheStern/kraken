// src/server/tickets/apply-pending-hours-record.ts
// Aplica las horas de un ticket que quedaron sin bolsa a una bolsa del cliente, ponderadas con su modalidad
// (AGENTS.md §2.6 paso 5, applyPendingHours).
import { weighMinutes } from "@/domain/hours/weigh-minutes";
import { bagIneligibility } from "@/domain/tickets/bag-eligibility";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCloseTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { loadTicketAccess } from "./load-ticket-access";
import { lockTicket } from "./lock-ticket";

export async function applyPendingHoursRecord(
  tx: Tx,
  user: SessionUser,
  { pendingId, bagId }: { pendingId: string; bagId: string },
  now: Date,
): Promise<ActionResult<{ minutes: number }>> {
  const pending = await tx.pendingHours.findUnique({
    where: { id: pendingId },
  });
  if (!pending)
    return actionError("NOT_FOUND", "Esas horas ya no están pendientes.");
  const ticket = await lockTicket(tx, pending.ticketId);
  const access = await loadTicketAccess(tx, pending.ticketId);
  if (!ticket || !access)
    return actionError("NOT_FOUND", "El ticket ya no existe.");
  if (!canCloseTicket(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo el coordinador o el gerente de un área del ticket, o el GG, aplican sus horas pendientes.",
    );
  const bag = await tx.hourBag.findUnique({
    where: { id: bagId },
    include: { areas: { select: { areaId: true } } },
  });
  if (!bag) return actionError("NOT_FOUND", "La bolsa ya no existe.");
  const reason = bagIneligibility(
    { ...bag, areaIds: bag.areas.map((a) => a.areaId) },
    {
      customerId: ticket.customerId,
      areaIds: access.areaIds,
      projectId: ticket.projectId,
    },
  );
  if (reason) return actionError("VALIDATION", reason);

  // TRAMPA: se marca primero con la condición PENDIENTE; dos aplicaciones simultáneas no descuentan dos veces.
  const marked = await tx.pendingHours.updateMany({
    where: { id: pendingId, status: "PENDIENTE" },
    data: { status: "APLICADA", appliedBagId: bagId, appliedAt: now },
  });
  if (marked.count === 0)
    return actionError(
      "INVALID_STATE",
      "Esas horas ya se aplicaron a una bolsa.",
    );
  // REGLA: los minutos reales se ponderan con la modalidad de la bolsa que los recibe (§2.5); sin un nuevo
  // redondeo, porque el total del ticket ya se redondeó al cerrar.
  const minutes = weighMinutes(pending, bag.modality);
  await postHourMovement(tx, {
    bagId,
    kind: "CONSUMO",
    minutes: 0 - minutes,
    actorId: user.id,
    ticketId: ticket.id,
    reason: `Horas pendientes del ticket #${ticket.number}`,
  });
  return actionOk({ minutes });
}
