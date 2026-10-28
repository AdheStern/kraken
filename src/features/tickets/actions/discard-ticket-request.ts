// src/features/tickets/actions/discard-ticket-request.ts
// Descarta una solicitud de ticket con motivo obligatorio (AGENTS.md §2.6 «Solicitudes de ticket», §7).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { discardTicketRequestRecord } from "@/server/tickets/discard-ticket-request-record";
import {
  type DiscardTicketRequestInput,
  discardTicketRequestSchema,
} from "../schemas/ticket-request-schemas";

export async function discardTicketRequest(
  input: DiscardTicketRequestInput,
): Promise<ActionResult<{ requestId: string }>> {
  const parsed = discardTicketRequestSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("discardTicketRequest", async (tx, user) => {
    const result = await discardTicketRequestRecord(
      tx,
      user,
      parsed.data,
      new Date(),
    );
    if (result.ok)
      await recordAudit(tx, {
        actorId: user.id,
        entity: "tickets.solicitud",
        entityId: result.data.requestId,
        action: "DESCARTAR",
        before: { status: "PENDIENTE" },
        after: { status: "DESCARTADA", reason: parsed.data.reason },
      });
    return result;
  });
}
