// src/features/tickets/actions/delete-time-entry.ts
// Borra un registro manual propio mientras el ticket siga abierto (AGENTS.md §2.6).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { deleteTimeEntryRecord } from "@/server/tickets/delete-time-entry-record";
import {
  type DeleteTimeEntryInput,
  deleteTimeEntrySchema,
} from "../schemas/ticket-time-schemas";

export async function deleteTimeEntry(
  input: DeleteTimeEntryInput,
): Promise<ActionResult<{ entryId: string }>> {
  const parsed = deleteTimeEntrySchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("deleteTimeEntry", (tx, user) =>
    deleteTimeEntryRecord(tx, user, parsed.data),
  );
}
