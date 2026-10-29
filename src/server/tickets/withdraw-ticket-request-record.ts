// src/server/tickets/withdraw-ticket-request-record.ts
// Quien pidió un ticket retira su solicitud mientras siga pendiente (AGENTS.md §2.6 «Solicitudes de ticket», §8).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canWithdrawTicketRequest } from "@/server/authz/ticket-request-permissions";
import type { Tx } from "@/server/db";
import { lockTicketRequest } from "./lock-ticket-request";

export async function withdrawTicketRequestRecord(
  tx: Tx,
  user: SessionUser,
  { requestId }: { requestId: string },
  now: Date,
): Promise<ActionResult<{ requestId: string }>> {
  const request = await lockTicketRequest(tx, requestId);
  if (!request || !canWithdrawTicketRequest(user, request))
    return actionError("NOT_FOUND", "La solicitud no existe o no es tuya.");
  if (request.status !== "PENDIENTE")
    return actionError(
      "INVALID_STATE",
      "Ya la atendieron: si el problema se resolvió, avísale al encargado del ticket.",
    );
  await tx.ticketRequest.update({
    where: { id: request.id },
    data: { status: "RETIRADA", handledById: user.id, handledAt: now },
  });
  return actionOk({ requestId: request.id });
}
