// src/features/tickets/actions/resume-timer.ts
// Reanuda el contador propio abriendo un tramo nuevo (AGENTS.md §8).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { changeTimerRecord } from "@/server/tickets/change-timer-record";
import { type TimerInput, timerSchema } from "../schemas/ticket-time-schemas";

export async function resumeTimer(
  input: TimerInput,
): Promise<ActionResult<{ status: string }>> {
  const parsed = timerSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("resumeTimer", (tx, user) =>
    changeTimerRecord(tx, user, { ...parsed.data, kind: "REANUDAR" }),
  );
}
