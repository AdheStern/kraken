// src/features/tickets/actions/update-subtask.ts
// Reasigna una subtarea o cambia su estado (AGENTS.md §2.6).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { updateSubtaskRecord } from "@/server/tickets/update-subtask-record";
import {
  type UpdateSubtaskInput,
  updateSubtaskSchema,
} from "../schemas/ticket-work-schemas";

export async function updateSubtask(
  input: UpdateSubtaskInput,
): Promise<ActionResult<{ subtaskId: string }>> {
  const parsed = updateSubtaskSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("updateSubtask", (tx, user) =>
    updateSubtaskRecord(tx, user, parsed.data, new Date()),
  );
}
