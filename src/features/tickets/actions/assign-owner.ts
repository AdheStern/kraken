// src/features/tickets/actions/assign-owner.ts
// Asigna o cambia el ingeniero encargado de un ticket (AGENTS.md §2.6, §7).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { assignTicketOwner } from "@/server/tickets/assign-ticket-owner";
import {
  type AssignOwnerInput,
  assignOwnerSchema,
} from "../schemas/ticket-schemas";

export async function assignOwner(
  input: AssignOwnerInput,
): Promise<ActionResult<{ ownerId: string }>> {
  const parsed = assignOwnerSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("assignOwner", async (tx, user) => {
    const result = await assignTicketOwner(tx, user, parsed.data, new Date());
    if (result.ok)
      await recordAudit(tx, {
        actorId: user.id,
        entity: "tickets.ticket",
        entityId: parsed.data.ticketId,
        action: "ASIGNAR",
        after: { ownerId: parsed.data.ownerId },
      });
    return result;
  });
}
