// src/server/tickets/notify-owner-assigned.ts
// Avisa a la persona que recibe un ticket o una subtarea, en la transacción de la asignación (ADR-08).
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";

export async function notifyOwnerAssigned(
  tx: Tx,
  ticket: { id: string; number: number },
  what: string,
  assigneeId: string,
  actor: SessionUser,
): Promise<void> {
  if (assigneeId === actor.id) return;
  await notify(tx, {
    event: "TICKET_ASIGNADO",
    userIds: [assigneeId],
    title: `Ticket #${ticket.number}: ${actor.name} te asignó trabajo`,
    body: `«${what}». Ábrelo para ver el detalle y registrar tu tiempo.`,
    link: `/tickets/${ticket.id}`,
  });
}
