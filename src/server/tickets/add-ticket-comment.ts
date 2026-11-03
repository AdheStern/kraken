// src/server/tickets/add-ticket-comment.ts
// Agrega un comentario interno o público a un ticket; el primer público del encargado es su primera
// respuesta del SLA (AGENTS.md §2.7).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCommentTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { refreshTicketSla } from "@/server/sla/refresh-ticket-sla";
import { loadTicketAccess } from "./load-ticket-access";
import { notifyCustomerActivity } from "./notify-customer-activity";

type NewComment = { ticketId: string; body: string; isPublic: boolean };

export async function addTicketComment(
  tx: Tx,
  user: SessionUser,
  { ticketId, body, isPublic: asked }: NewComment,
  now: Date,
): Promise<ActionResult<{ commentId: string }>> {
  // REGLA: lo que escribe un cliente siempre es público (§2.11).
  const isPublic = user.customer ? true : asked;
  const access = await loadTicketAccess(tx, ticketId);
  if (!access) return actionError("NOT_FOUND", "El ticket ya no existe.");
  if (!canCommentTicket(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo quienes trabajan o gestionan el ticket pueden comentar.",
    );
  const comment = await tx.comment.create({
    data: { ticketId, authorId: user.id, body, isPublic, createdAt: now },
    select: { id: true },
  });
  if (user.customer)
    await notifyCustomerActivity(tx, user, ticketId, { kind: "COMENTARIO" });
  if (isPublic && access.ownerId === user.id) {
    await tx.ticket.updateMany({
      where: { id: ticketId, firstResponseAt: null },
      data: { firstResponseAt: now },
    });
    await refreshTicketSla(tx, ticketId, now);
  }
  return actionOk({ commentId: comment.id });
}
