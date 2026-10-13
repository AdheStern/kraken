// src/features/notifications/actions/mark-inbox-read.ts
// Marca como leídos avisos propios de la bandeja; los ajenos se ignoran por el alcance (regla 7).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { scopeInboxQuery } from "@/server/authz/scope-inbox-query";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type MarkInboxReadInput,
  markInboxReadSchema,
} from "../schemas/mark-inbox-read-schema";

export async function markInboxRead(
  input: MarkInboxReadInput,
): Promise<ActionResult<{ marked: number }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = markInboxReadSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", "No pudimos identificar los avisos.");
  try {
    const target = "ids" in parsed.data ? { id: { in: parsed.data.ids } } : {};
    const { count } = await prisma.inboxItem.updateMany({
      where: { AND: [scopeInboxQuery(user), target, { readAt: null }] },
      data: { readAt: systemClock.now() },
    });
    return actionOk({ marked: count });
  } catch (error) {
    return toActionError(error, "markInboxRead");
  }
}
