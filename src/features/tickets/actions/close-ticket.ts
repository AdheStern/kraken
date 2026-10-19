// src/features/tickets/actions/close-ticket.ts
// Cierra un ticket resuelto y descuenta sus horas de las bolsas (AGENTS.md §2.6, §3 flujo de cierre).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type ClosedTicket,
  closeTicketHours,
} from "@/server/tickets/close-ticket-hours";
import {
  type CloseTicketInput,
  closeTicketSchema,
} from "../schemas/ticket-close-schemas";

export async function closeTicket(
  input: CloseTicketInput,
): Promise<ActionResult<ClosedTicket>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = closeTicketSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { ticketId } = parsed.data;
  try {
    return await runInTransaction(async (tx) => {
      const result = await closeTicketHours(tx, user, { ticketId }, new Date());
      if (result.ok)
        await recordAudit(tx, {
          actorId: user.id,
          entity: "tickets.ticket",
          entityId: ticketId,
          action: "CERRAR",
          before: { status: "RESUELTO" },
          after: { status: "CERRADO", ...result.data },
        });
      return result;
    });
  } catch (error) {
    return toActionError(error, "closeTicket");
  }
}
