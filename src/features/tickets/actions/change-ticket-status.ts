// src/features/tickets/actions/change-ticket-status.ts
// Mueve un ticket por su ciclo de trabajo; el cierre y la reapertura tienen su action (AGENTS.md §8).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { changeTicketStatusRecord } from "@/server/tickets/change-ticket-status-record";
import {
  type ChangeTicketStatusInput,
  changeTicketStatusSchema,
} from "../schemas/ticket-schemas";

export async function changeTicketStatus(
  input: ChangeTicketStatusInput,
): Promise<ActionResult<{ status: string }>> {
  const parsed = changeTicketStatusSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("changeTicketStatus", (tx, user) =>
    changeTicketStatusRecord(tx, user, parsed.data, new Date()),
  );
}
