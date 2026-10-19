// src/server/tickets/assign-ticket-owner.ts
// Asigna (o cambia) el ingeniero encargado de un ticket; un ticket NUEVO pasa a ASIGNADO (AGENTS.md §2.6, §8).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCloseTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import { isTicketEngineer, loadTicketAccess } from "./load-ticket-access";
import { lockTicket } from "./lock-ticket";
import { notifyOwnerAssigned } from "./notify-owner-assigned";

export async function assignTicketOwner(
  tx: Tx,
  user: SessionUser,
  { ticketId, ownerId }: { ticketId: string; ownerId: string },
  now: Date,
): Promise<ActionResult<{ ownerId: string }>> {
  const ticket = await lockTicket(tx, ticketId);
  const access = await loadTicketAccess(tx, ticketId);
  if (!ticket || !access)
    return actionError("NOT_FOUND", "El ticket ya no existe.");
  if (!canCloseTicket(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo el coordinador o el gerente de un área del ticket, o el GG, asignan el encargado.",
    );
  if (ticket.status === "CERRADO" || ticket.status === "CANCELADO")
    return actionError(
      "INVALID_STATE",
      "El ticket ya terminó. Reábrelo para cambiar el encargado.",
    );
  if (!(await isTicketEngineer(tx, ownerId, access.areaIds)))
    return actionError(
      "VALIDATION",
      "El encargado debe ser un ingeniero de un área del ticket.",
    );

  const { title } = await tx.ticket.update({
    where: { id: ticketId },
    data: { ownerId },
    select: { title: true },
  });
  if (ticket.status === "NUEVO")
    await applyStatusChange(tx, {
      ticketId,
      from: "NUEVO",
      to: "ASIGNADO",
      actorId: user.id,
      now,
    });
  await notifyOwnerAssigned(tx, ticket, title, ownerId, user);
  return actionOk({ ownerId });
}
