// src/features/sales-control/actions/void-cv.ts
// Anula la versión vigente de un CV (borrador o aprobada sin consumos), con motivo obligatorio (§8).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { systemClock } from "@/server/clock";
import { prisma, runInTransaction } from "@/server/db";
import { voidLatestVersion } from "@/server/sales-control/void-version";
import { getSessionUser } from "@/server/session";
import {
  type VersionReasonInput,
  versionReasonSchema,
} from "../schemas/version-schemas";

export async function voidCv(
  input: VersionReasonInput,
): Promise<ActionResult<{ cvVoided: boolean }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = versionReasonSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const visible = await prisma.cv.count({
    where: { AND: [scopeCvQuery(user), { id: parsed.data.cvId }] },
  });
  if (visible === 0)
    return actionError("NOT_FOUND", "El CV ya no existe o no lo puedes ver.");
  try {
    return await runInTransaction((tx) =>
      voidLatestVersion(tx, user, parsed.data, systemClock.now()),
    );
  } catch (error) {
    return toActionError(error, "voidCv");
  }
}
