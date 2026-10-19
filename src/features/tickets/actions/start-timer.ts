// src/features/tickets/actions/start-timer.ts
// Inicia el contador del usuario en un ticket o una subtarea (AGENTS.md §2.6, §8 contador).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { startTimerRecord } from "@/server/tickets/start-timer-record";
import {
  type StartTimerInput,
  startTimerSchema,
} from "../schemas/ticket-time-schemas";

export async function startTimer(
  input: StartTimerInput,
): Promise<ActionResult<{ timerId: string }>> {
  const parsed = startTimerSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("startTimer", (tx, user) =>
    startTimerRecord(tx, user, parsed.data),
  );
}
