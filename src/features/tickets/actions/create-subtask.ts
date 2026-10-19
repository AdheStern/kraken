// src/features/tickets/actions/create-subtask.ts
// Crea una subtarea del ticket y la asigna (AGENTS.md §2.6).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { createSubtaskRecord } from "@/server/tickets/create-subtask-record";
import {
  type CreateSubtaskInput,
  createSubtaskSchema,
} from "../schemas/ticket-work-schemas";

export async function createSubtask(
  input: CreateSubtaskInput,
): Promise<ActionResult<{ subtaskId: string }>> {
  const parsed = createSubtaskSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("createSubtask", (tx, user) =>
    createSubtaskRecord(tx, user, parsed.data),
  );
}
