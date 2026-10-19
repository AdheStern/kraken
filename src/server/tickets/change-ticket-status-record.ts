// src/server/tickets/change-ticket-status-record.ts
// Mueve un ticket por su ciclo de trabajo (EN_PROGRESO, EN_ESPERA_CLIENTE, RESUELTO, CANCELADO) según §8;
// el cierre y la reapertura van por sus propias funciones porque mueven horas.
import {
  canTransitionTicket,
  type TicketStatus,
} from "@/domain/tickets/ticket-state-machine";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import {
  canCloseTicket,
  canManageTicket,
} from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import { loadTicketAccess } from "./load-ticket-access";
import { lockTicket } from "./lock-ticket";

type WorkStatus = Extract<
  TicketStatus,
  "EN_PROGRESO" | "EN_ESPERA_CLIENTE" | "RESUELTO" | "CANCELADO"
>;

export async function changeTicketStatusRecord(
  tx: Tx,
  user: SessionUser,
  { ticketId, to }: { ticketId: string; to: WorkStatus },
  now: Date,
): Promise<ActionResult<{ status: TicketStatus }>> {
  const ticket = await lockTicket(tx, ticketId);
  const access = await loadTicketAccess(tx, ticketId);
  if (!ticket || !access)
    return actionError("NOT_FOUND", "El ticket ya no existe.");
  // REGLA: cancelar es de quien gestiona el área; el encargado mueve el trabajo hasta RESUELTO (§2.9).
  const allowed =
    to === "CANCELADO"
      ? canCloseTicket(user, access)
      : canManageTicket(user, access);
  if (!allowed)
    return actionError(
      "FORBIDDEN",
      "Solo el encargado, el coordinador o el gerente del área cambian el estado de este ticket.",
    );
  // TRAMPA: CERRADO → EN_PROGRESO es válido en §8, pero solo como reapertura (con REVERSO de horas).
  if (ticket.status === "CERRADO")
    return actionError(
      "INVALID_STATE",
      "El ticket está cerrado. Usa «Reabrir» para revertir sus horas.",
    );
  if (!canTransitionTicket(ticket.status, to))
    return actionError(
      "INVALID_STATE",
      "Ese cambio de estado no está permitido desde el estado actual. Recarga la página.",
    );
  await applyStatusChange(tx, {
    ticketId,
    from: ticket.status,
    to,
    actorId: user.id,
    now,
  });
  return actionOk({ status: to });
}
