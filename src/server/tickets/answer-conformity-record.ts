// src/server/tickets/answer-conformity-record.ts
// La cuenta de un cliente responde si quedó conforme con la resolución de su ticket (§2.11, decisión 2026-11-05):
// conforme con nota 1–5 queda registrado y el cierre sigue siendo interno; no conforme deja su comentario público
// y vuelve el ticket a EN_PROGRESO, que reanuda el SLA (§2.7, §8).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCustomerTicketQuery } from "@/server/authz/scope-customer-ticket-query";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import { lockTicket } from "./lock-ticket";
import { notifyCustomerActivity } from "./notify-customer-activity";

export type ConformityAnswer =
  | { ticketId: string; isSatisfied: true; rating: number }
  | { ticketId: string; isSatisfied: false; comment: string };

export async function answerConformityRecord(
  tx: Tx,
  user: SessionUser,
  answer: ConformityAnswer,
  now: Date,
): Promise<ActionResult<{ status: "RESUELTO" | "EN_PROGRESO" }>> {
  if (!user.customer)
    return actionError("FORBIDDEN", "Solo el cliente responde su conformidad.");
  const ticket = await lockTicket(tx, answer.ticketId);
  const visible = await tx.ticket.findFirst({
    where: { AND: [scopeCustomerTicketQuery(user), { id: answer.ticketId }] },
    select: { id: true },
  });
  if (!ticket || !visible)
    return actionError(
      "NOT_FOUND",
      "El ticket ya no existe o no es de tu empresa.",
    );
  if (ticket.status !== "RESUELTO")
    return actionError(
      "INVALID_STATE",
      "El ticket ya no está resuelto. Recarga la página.",
    );
  const resolved = await tx.ticketStatusEvent.findFirst({
    where: { ticketId: ticket.id, toStatus: "RESUELTO" },
    orderBy: { occurredAt: "desc" },
    select: { id: true, conformity: { select: { id: true } } },
  });
  if (!resolved || resolved.conformity)
    return actionError("CONFLICT", "Ya respondiste por esta resolución.");
  await tx.ticketConformity.create({
    data: {
      ticketId: ticket.id,
      statusEventId: resolved.id,
      isSatisfied: answer.isSatisfied,
      rating: answer.isSatisfied ? answer.rating : null,
      comment: answer.isSatisfied ? null : answer.comment,
      authorId: user.id,
      createdAt: now,
    },
  });
  if (answer.isSatisfied) {
    await notifyCustomerActivity(tx, user, ticket.id, {
      kind: "CONFORME",
      rating: answer.rating,
    });
    return actionOk({ status: "RESUELTO" });
  }
  // REGLA: lo que escribe el cliente es público (§2.11); el motivo queda en la conversación del ticket.
  await tx.comment.create({
    data: {
      ticketId: ticket.id,
      authorId: user.id,
      body: answer.comment,
      isPublic: true,
      createdAt: now,
    },
  });
  await applyStatusChange(tx, {
    ticketId: ticket.id,
    from: "RESUELTO",
    to: "EN_PROGRESO",
    actorId: user.id,
    now,
  });
  await notifyCustomerActivity(tx, user, ticket.id, { kind: "NO_CONFORME" });
  return actionOk({ status: "EN_PROGRESO" });
}
