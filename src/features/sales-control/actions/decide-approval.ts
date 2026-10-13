// src/features/sales-control/actions/decide-approval.ts
// Aprueba o rechaza (con comentario) la solicitud de un área o del GG y resuelve la ronda (§2.3).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { systemClock } from "@/server/clock";
import { runInTransaction } from "@/server/db";
import { decideRequest } from "@/server/sales-control/decide-request";
import { getSessionUser } from "@/server/session";
import {
  type DecideApprovalInput,
  decideApprovalSchema,
} from "../schemas/version-schemas";

export async function decideApproval(
  input: DecideApprovalInput,
): Promise<ActionResult<{ round: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = decideApprovalSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    return await runInTransaction((tx) =>
      decideRequest(tx, user, parsed.data, systemClock.now()),
    );
  } catch (error) {
    return toActionError(error, "decideApproval");
  }
}
