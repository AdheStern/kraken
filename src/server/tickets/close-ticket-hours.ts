// src/server/tickets/close-ticket-hours.ts
// Cierra un ticket RESUELTO descontando sus horas de las bolsas por jerarquía, con lo que no alcance a
// pendiente sin bolsa, todo en la transacción recibida (AGENTS.md §2.6, §3 flujo de cierre, HORAS-01).
import { allocateTicketHours } from "@/domain/hours/allocate-ticket-hours";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { hasActiveTimers } from "./has-active-timers";
import { loadTicketAllocation } from "./load-ticket-allocation";
import { lockTicketForTransition } from "./lock-ticket-for-transition";
import { recordPendingHours } from "./record-pending-hours";

export type ClosedTicket = {
  chargedMinutes: number;
  pendingMinutes: number;
  waivedMinutes: number;
  consumptions: { bagId: string; minutes: number }[];
};

export async function closeTicketHours(
  tx: Tx,
  user: SessionUser,
  { ticketId }: { ticketId: string },
  now: Date,
): Promise<ActionResult<ClosedTicket>> {
  const locked = await lockTicketForTransition(
    tx,
    user,
    ticketId,
    "CERRADO",
    "Solo se cierra un ticket resuelto. Márcalo como resuelto primero.",
  );
  if (!locked.ok) return locked;
  const ticket = locked.data;
  if (await hasActiveTimers(tx, ticketId))
    return actionError(
      "INVALID_STATE",
      "Hay contadores activos o pausados en el ticket. Termínalos antes de cerrarlo.",
    );

  const input = await loadTicketAllocation(tx, ticket);
  const allocation = allocateTicketHours(
    input.intervals,
    input.bags,
    input.calendar,
  );
  // REGLA: un CONSUMO por bolsa, con el redondeo incluido; las firmes ya tienen el suyo (§2.6 paso 4).
  const charged = allocation.consumptions.filter((c) => !c.isSettled);
  for (const { bagId, minutes } of charged)
    await postHourMovement(tx, {
      bagId,
      kind: "CONSUMO",
      minutes: 0 - minutes,
      actorId: user.id,
      ticketId,
      reason: `Cierre del ticket #${ticket.number}`,
    });
  const { insideMinutes, outsideMinutes } = allocation.pending;
  if (insideMinutes + outsideMinutes > 0)
    await recordPendingHours(tx, ticket, allocation.pending, user.id);
  await tx.ticket.update({
    where: { id: ticketId },
    data: { status: "CERRADO", closedAt: now },
  });
  return actionOk({
    chargedMinutes: charged.reduce((sum, c) => sum + c.minutes, 0),
    pendingMinutes: insideMinutes + outsideMinutes,
    waivedMinutes: allocation.waivedRoundingMinutes,
    consumptions: charged.map(({ bagId, minutes }) => ({ bagId, minutes })),
  });
}
