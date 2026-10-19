// src/server/tickets/subtask-guards.ts
// Verificaciones comunes de las subtareas: quién las gestiona, a quién se asignan y que el ticket siga abierto
// (AGENTS.md §2.6, §2.9).
import { type ActionResult, actionError } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canManageTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { isTicketEngineer, loadTicketAccess } from "./load-ticket-access";

const FINISHED = ["CERRADO", "CANCELADO"];

export async function checkSubtaskManageable(
  tx: Tx,
  user: SessionUser,
  ticketId: string,
  assigneeId: string | null,
): Promise<ActionResult<never> | null> {
  const access = await loadTicketAccess(tx, ticketId);
  if (!access) return actionError("NOT_FOUND", "El ticket ya no existe.");
  if (!canManageTicket(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo el encargado, el coordinador o el gerente del área gestionan las subtareas.",
    );
  if (assigneeId && !(await isTicketEngineer(tx, assigneeId, access.areaIds)))
    return actionError(
      "VALIDATION",
      "Asigna la subtarea a un ingeniero de un área del ticket.",
    );
  return checkTicketOpen(tx, ticketId);
}

export async function checkTicketOpen(
  tx: Tx,
  ticketId: string,
): Promise<ActionResult<never> | null> {
  const ticket = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: { status: true },
  });
  if (!ticket || FINISHED.includes(ticket.status))
    return actionError(
      "INVALID_STATE",
      "El ticket ya terminó. Reábrelo para cambiar sus subtareas.",
    );
  return null;
}
