// src/server/tickets/reopen-ticket-hours.ts
// Reabre un ticket cerrado: lo descontado queda firme y el pendiente sin bolsa no aplicado se descarta; al volver a
// cerrarlo solo se cobra lo que falte (AGENTS.md §2.6, §8 CERRADO → EN_PROGRESO).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import { lockTicketForTransition } from "./lock-ticket-for-transition";

export type DiscardedPending = {
  insideMinutes: number;
  outsideMinutes: number;
};

export type ReopenedTicket = {
  keptMinutes: number;
  discardedPending: DiscardedPending[];
};

const NOT_CLOSED = "Solo se reabre un ticket cerrado.";

export async function reopenTicketHours(
  tx: Tx,
  user: SessionUser,
  { ticketId }: { ticketId: string },
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
  // TRAMPA: RESUELTO → EN_PROGRESO también es válido (no conforme), pero no es una reapertura.
  if (locked.data.status !== "CERRADO")
    return actionError("INVALID_STATE", NOT_CLOSED);

  // REGLA: reabrir no devuelve horas a ninguna bolsa; lo descontado queda firme (decisión 2026-10-29, §2.6).
  const kept = await tx.hourMovement.aggregate({
    where: { ticketId, kind: "CONSUMO", reversedBy: { is: null } },
    _sum: { minutes: true },
  });
  const discardedPending = await discardPending(tx, ticketId);
  await applyStatusChange(tx, {
    ticketId,
    from: "CERRADO",
    to: "EN_PROGRESO",
    actorId: user.id,
    now,
  });
  return actionOk({
    keptMinutes: 0 - (kept._sum.minutes ?? 0),
    discardedPending,
  });
}

// POR QUÉ: el pendiente sin aplicar se recalcula al volver a cerrar; el aplicado ya es un CONSUMO firme en su
// bolsa y queda en el historial (decisión 2026-10-29).
async function discardPending(
  tx: Tx,
  ticketId: string,
): Promise<DiscardedPending[]> {
  const where = { ticketId, status: "PENDIENTE" as const };
  const rows = await tx.pendingHours.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: { insideMinutes: true, outsideMinutes: true },
  });
  await tx.pendingHours.deleteMany({ where });
  return rows;
}
