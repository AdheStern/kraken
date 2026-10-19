// src/features/tickets/actions/stop-timer.ts
// Termina el contador propio; el ticket se cierra solo sin contadores activos (AGENTS.md §2.6, §8).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { changeTimerRecord } from "@/server/tickets/change-timer-record";
import { type TimerInput, timerSchema } from "../schemas/ticket-time-schemas";

export async function stopTimer(
  input: TimerInput,
): Promise<ActionResult<{ status: string }>> {
  const parsed = timerSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("stopTimer", (tx, user) =>
    changeTimerRecord(tx, user, { ...parsed.data, kind: "TERMINAR" }),
  );
}
