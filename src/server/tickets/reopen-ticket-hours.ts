// src/server/tickets/reopen-ticket-hours.ts
// Reabre un ticket cerrado: revierte sus consumos con REVERSO y descarta su pendiente sin bolsa, que se
// recalculan al volver a cerrarlo (AGENTS.md §2.6, §8 CERRADO → EN_PROGRESO).
import { isTerminalBagStatus } from "@/domain/hours/bag-state-machine";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { lockBags } from "@/server/hours/lock-bags";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { applyStatusChange } from "./apply-status-change";
import type { LockedTicket } from "./lock-ticket";
import { lockTicketForTransition } from "./lock-ticket-for-transition";

export type DiscardedPending = {
  insideMinutes: number;
  outsideMinutes: number;
  status: "PENDIENTE" | "APLICADA";
};

export type ReopenedTicket = {
  reversedMinutes: number;
  keptMinutes: number;
  discardedPending: DiscardedPending[];
};

const NOT_CLOSED = "Solo se reabre un ticket cerrado.";

export async function reopenTicketHours(
  tx: Tx,
  user: SessionUser,
  { ticketId, reason }: { ticketId: string; reason: string },
  now: Date,
): Promise<ActionResult<ReopenedTicket>> {
  const locked = await lockTicketForTransition(
    tx,
    user,
    ticketId,
    "EN_PROGRESO",
    NOT_CLOSED,
  );
  if (!locked.ok) return locked;
  const ticket = locked.data;
  // TRAMPA: RESUELTO → EN_PROGRESO también es válido (no conforme), pero no es una reapertura.
  if (ticket.status !== "CERRADO")
    return actionError("INVALID_STATE", NOT_CLOSED);

  const { reversedMinutes, keptMinutes } = await reverseConsumptions(
    tx,
    user,
    ticket,
    reason,
  );
  const discardedPending = await discardPending(tx, ticketId);
  await applyStatusChange(tx, {
    ticketId,
    from: "CERRADO",
    to: "EN_PROGRESO",
    actorId: user.id,
    now,
  });
  return actionOk({ reversedMinutes, keptMinutes, discardedPending });
}

async function reverseConsumptions(
  tx: Tx,
  user: SessionUser,
  ticket: LockedTicket,
  reason: string,
) {
  const consumptions = await tx.hourMovement.findMany({
    where: { ticketId: ticket.id, kind: "CONSUMO", reversedBy: { is: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, bagId: true, minutes: true },
  });
  const bags = await lockBags(
    tx,
    consumptions.map((c) => c.bagId),
  );
  let reversedMinutes = 0;
  let keptMinutes = 0;
  for (const { id, bagId, minutes } of consumptions) {
    const status = bags.get(bagId)?.status;
    // POR QUÉ: el consumo en una bolsa VENCIDA o CERRADA queda firme; el próximo cierre la trata como
    // bolsa firme para no cobrar dos veces (decisión del 2026-10-19).
    if (!status || isTerminalBagStatus(status)) {
      keptMinutes -= minutes;
      continue;
    }
    await postHourMovement(tx, {
      bagId,
      kind: "REVERSO",
      minutes: 0 - minutes,
      actorId: user.id,
      ticketId: ticket.id,
      reversesId: id,
      reason: `Reapertura del ticket #${ticket.number} · ${reason}`,
    });
    reversedMinutes -= minutes;
  }
  return { reversedMinutes, keptMinutes };
}

// POR QUÉ: el pendiente, aplicado o no, se recalcula al volver a cerrar; el CONSUMO de una aplicación ya se
// revirtió arriba y el rastro queda en el libro y en la auditoría de la reapertura (decisión del 2026-10-19).
async function discardPending(
  tx: Tx,
  ticketId: string,
): Promise<DiscardedPending[]> {
  const rows = await tx.pendingHours.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    select: { insideMinutes: true, outsideMinutes: true, status: true },
  });
  await tx.pendingHours.deleteMany({ where: { ticketId } });
  return rows;
}
