// src/features/tickets/actions/withdraw-ticket-request.ts
// Retira una solicitud de ticket propia y pendiente (AGENTS.md §2.6 «Solicitudes de ticket», §7).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { withdrawTicketRequestRecord } from "@/server/tickets/withdraw-ticket-request-record";
import {
  type WithdrawTicketRequestInput,
  withdrawTicketRequestSchema,
} from "../schemas/ticket-request-schemas";

export async function withdrawTicketRequest(
  input: WithdrawTicketRequestInput,
): Promise<ActionResult<{ requestId: string }>> {
  const parsed = withdrawTicketRequestSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("withdrawTicketRequest", async (tx, user) => {
    const result = await withdrawTicketRequestRecord(
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
        action: "RETIRAR",
        before: { status: "PENDIENTE" },
        after: { status: "RETIRADA" },
      });
    return result;
  });
}
