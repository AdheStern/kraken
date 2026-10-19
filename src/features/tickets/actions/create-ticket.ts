// src/features/tickets/actions/create-ticket.ts
// Crea un ticket con sus áreas y, si se elige, su encargado (AGENTS.md §2.6, §7).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { createTicketRecord } from "@/server/tickets/create-ticket-record";
import {
  type CreateTicketInput,
  createTicketSchema,
} from "../schemas/ticket-schemas";

export async function createTicket(
  input: CreateTicketInput,
): Promise<ActionResult<{ ticketId: string; number: number }>> {
  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("createTicket", async (tx, user) => {
    const result = await createTicketRecord(tx, user, parsed.data, new Date());
    if (result.ok)
      await recordAudit(tx, {
        actorId: user.id,
        entity: "tickets.ticket",
        entityId: result.data.ticketId,
        action: "CREAR",
        after: parsed.data,
      });
    return result;
  });
}
