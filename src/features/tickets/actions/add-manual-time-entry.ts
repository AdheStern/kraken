// src/features/tickets/actions/add-manual-time-entry.ts
// Registra un tramo de tiempo manual con inicio y fin (AGENTS.md §2.6 registro de tiempo).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { addManualTimeEntryRecord } from "@/server/tickets/add-manual-time-entry-record";
import {
  type ManualTimeEntryInput,
  manualTimeEntrySchema,
} from "../schemas/ticket-time-schemas";

export async function addManualTimeEntry(
  input: ManualTimeEntryInput,
): Promise<ActionResult<{ entryId: string; isLate: boolean }>> {
  const parsed = manualTimeEntrySchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("addManualTimeEntry", (tx, user) =>
    addManualTimeEntryRecord(
      tx,
      user,
      {
        ...parsed.data,
        startedAt: new Date(parsed.data.startedAt),
        endedAt: new Date(parsed.data.endedAt),
      },
      new Date(),
    ),
  );
}
