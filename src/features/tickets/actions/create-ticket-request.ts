// src/features/tickets/actions/create-ticket-request.ts
// Pide un ticket a un área: cualquier usuario con rol (AGENTS.md §2.6 «Solicitudes de ticket», §7).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { createTicketRequestRecord } from "@/server/tickets/create-ticket-request-record";
import {
  type CreateTicketRequestInput,
  createTicketRequestSchema,
} from "../schemas/ticket-request-schemas";

export async function createTicketRequest(
  input: CreateTicketRequestInput,
): Promise<ActionResult<{ requestId: string; number: number }>> {
  const parsed = createTicketRequestSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("createTicketRequest", async (tx, user) => {
    const result = await createTicketRequestRecord(
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
        action: "CREAR",
        after: parsed.data,
      });
    return result;
  });
}
