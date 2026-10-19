// src/server/tickets/lock-ticket-for-transition.ts
// Bloquea un ticket y verifica que el usuario pueda llevarlo al estado pedido (cerrar o reabrir),
// según AGENTS.md §2.9 y la máquina de estados de §8.
import {
  canTransitionTicket,
  type TicketStatus,
} from "@/domain/tickets/ticket-state-machine";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCloseTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { type LockedTicket, lockTicket } from "./lock-ticket";

export async function lockTicketForTransition(
  tx: Tx,
  user: SessionUser,
  ticketId: string,
  to: Extract<TicketStatus, "CERRADO" | "EN_PROGRESO">,
  invalidStateMessage: string,
): Promise<ActionResult<LockedTicket>> {
  const ticket = await lockTicket(tx, ticketId);
  if (!ticket) return actionError("NOT_FOUND", "El ticket ya no existe.");
  const areas = await tx.ticketArea.findMany({
    where: { ticketId },
    select: { areaId: true },
  });
  if (!canCloseTicket(user, { areaIds: areas.map((a) => a.areaId) }))
    return actionError(
      "FORBIDDEN",
      "Solo el coordinador o el gerente de un área del ticket, o el GG, pueden cerrarlo o reabrirlo.",
    );
  if (!canTransitionTicket(ticket.status, to))
    return actionError("INVALID_STATE", invalidStateMessage);
  return actionOk(ticket);
}
