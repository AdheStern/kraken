// src/server/tickets/discard-ticket-request-record.ts
// Descarta una solicitud de ticket pendiente con su motivo y avisa a quien la pidió (AGENTS.md §2.6, §8).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canHandleTicketRequest } from "@/server/authz/ticket-request-permissions";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { lockTicketRequest } from "./lock-ticket-request";

export async function discardTicketRequestRecord(
  tx: Tx,
  user: SessionUser,
  input: { requestId: string; reason: string },
  now: Date,
): Promise<ActionResult<{ requestId: string }>> {
  const request = await lockTicketRequest(tx, input.requestId);
  if (!request || !canHandleTicketRequest(user, request))
    return actionError(
      "NOT_FOUND",
      "La solicitud no existe o no es de un área que atiendes.",
    );
  if (request.status !== "PENDIENTE")
    return actionError(
      "INVALID_STATE",
      "Otra persona ya atendió esta solicitud. Revisa la lista de pendientes.",
    );
  await tx.ticketRequest.update({
    where: { id: request.id },
    data: {
      status: "DESCARTADA",
      discardReason: input.reason,
      handledById: user.id,
      handledAt: now,
    },
  });
  if (request.requesterId !== user.id)
    await notify(tx, {
      event: "SOLICITUD_DESCARTADA",
      userIds: [request.requesterId],
      title: `Se descartó tu solicitud #${request.number}: ${request.title}`,
      body: `${user.name} la descartó: «${input.reason}». Si sigues con el problema, crea una solicitud nueva con más detalle.`,
      link: "/solicitudes",
    });
  return actionOk({ requestId: request.id });
}
