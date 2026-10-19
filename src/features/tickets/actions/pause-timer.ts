// src/features/tickets/actions/pause-timer.ts
// Pausa el contador propio; el tramo en curso se cierra con la hora del servidor (AGENTS.md §8).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { changeTimerRecord } from "@/server/tickets/change-timer-record";
import { type TimerInput, timerSchema } from "../schemas/ticket-time-schemas";

export async function pauseTimer(
  input: TimerInput,
): Promise<ActionResult<{ status: string }>> {
  const parsed = timerSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("pauseTimer", (tx, user) =>
    changeTimerRecord(tx, user, { ...parsed.data, kind: "PAUSAR" }),
  );
}
