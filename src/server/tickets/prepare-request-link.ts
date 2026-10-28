// src/server/tickets/prepare-request-link.ts
// Valida y bloquea la solicitud de la que nace un ticket y devuelve cómo enlazarla una vez creado, en la misma
// transacción del alta (AGENTS.md §2.6 «Solicitudes de ticket»).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canHandleTicketRequest } from "@/server/authz/ticket-request-permissions";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { lockTicketRequest } from "./lock-ticket-request";

type Link = (ticket: { id: string; number: number }) => Promise<void>;

// POR QUÉ: se valida antes de crear el ticket; una action que devuelve error confirma su transacción.
export async function prepareRequestLink(
  tx: Tx,
  user: SessionUser,
  requestId: string,
  areaIds: readonly string[],
  now: Date,
): Promise<ActionResult<Link>> {
  const request = await lockTicketRequest(tx, requestId);
  if (!request || !canHandleTicketRequest(user, request))
    return actionError(
      "NOT_FOUND",
      "La solicitud no existe o no es de un área que atiendes.",
    );
  if (request.status !== "PENDIENTE")
    return actionError(
      "CONFLICT",
      "Otra persona ya atendió esta solicitud. Revisa la lista de pendientes.",
    );
  if (!areaIds.includes(request.areaId))
    return actionError(
      "VALIDATION",
      "El ticket debe incluir el área de la solicitud.",
    );
  return actionOk(async (ticket) => {
    await tx.ticketRequest.update({
      where: { id: request.id },
      data: {
        status: "ATENDIDA",
        ticketId: ticket.id,
        handledById: user.id,
        handledAt: now,
      },
    });
    if (request.requesterId === user.id) return;
    await notify(tx, {
      event: "SOLICITUD_ESTADO",
      userIds: [request.requesterId],
      title: `Tu solicitud #${request.number} ya es el ticket #${ticket.number}`,
      body: `${user.name} creó el ticket. Te avisaremos cuando lo empiecen a atender y cuando se resuelva.`,
      link: "/solicitudes",
    });
  });
}
