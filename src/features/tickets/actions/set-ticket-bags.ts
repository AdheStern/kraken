// src/features/tickets/actions/set-ticket-bags.ts
// Define la jerarquía ordenada de bolsas que llena el cierre del ticket (AGENTS.md §2.6).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { setTicketBagsRecord } from "@/server/tickets/set-ticket-bags";
import {
  type SetTicketBagsInput,
  setTicketBagsSchema,
} from "../schemas/ticket-work-schemas";

export async function setTicketBags(
  input: SetTicketBagsInput,
): Promise<ActionResult<{ bagIds: string[] }>> {
  const parsed = setTicketBagsSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("setTicketBags", async (tx, user) => {
    const result = await setTicketBagsRecord(tx, user, parsed.data);
    if (result.ok)
      await recordAudit(tx, {
        actorId: user.id,
        entity: "tickets.ticket",
        entityId: parsed.data.ticketId,
        action: "ORDENAR_BOLSAS",
        after: { bagIds: parsed.data.bagIds },
      });
    return result;
  });
}
