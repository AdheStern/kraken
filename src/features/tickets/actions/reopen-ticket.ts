// src/features/tickets/actions/reopen-ticket.ts
// Reabre un ticket cerrado con motivo; lo descontado queda firme (AGENTS.md §2.6, §8).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type ReopenedTicket,
  reopenTicketHours,
} from "@/server/tickets/reopen-ticket-hours";
import {
  type ReopenTicketInput,
  reopenTicketSchema,
} from "../schemas/ticket-close-schemas";

export async function reopenTicket(
  input: ReopenTicketInput,
): Promise<ActionResult<ReopenedTicket>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = reopenTicketSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { ticketId, reason } = parsed.data;
  try {
    return await runInTransaction(async (tx) => {
      const result = await reopenTicketHours(
        tx,
        user,
        { ticketId },
        new Date(),
      );
      if (result.ok)
        await recordAudit(tx, {
          actorId: user.id,
          entity: "tickets.ticket",
          entityId: ticketId,
          action: "REABRIR",
          before: {
            status: "CERRADO",
            pendingHours: result.data.discardedPending,
          },
          after: {
            status: "EN_PROGRESO",
            reason,
            keptMinutes: result.data.keptMinutes,
          },
        });
      return result;
    });
  } catch (error) {
    return toActionError(error, "reopenTicket");
  }
}
