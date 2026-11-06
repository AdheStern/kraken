// src/features/tickets/actions/answer-ticket-conformity.ts
// El cliente responde si quedó conforme con la resolución de su ticket (§2.11, decisión 2026-11-05).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { runUserAction } from "@/server/run-user-action";
import { answerConformityRecord } from "@/server/tickets/answer-conformity-record";
import {
  type ConformityInput,
  conformitySchema,
} from "../schemas/conformity-schema";

export async function answerTicketConformity(
  input: ConformityInput,
): Promise<ActionResult<{ status: "RESUELTO" | "EN_PROGRESO" }>> {
  const parsed = conformitySchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("answerTicketConformity", (tx, user) =>
    answerConformityRecord(tx, user, parsed.data, new Date()),
  );
}
