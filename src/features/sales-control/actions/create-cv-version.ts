// src/features/sales-control/actions/create-cv-version.ts
// Abre una versión nueva en borrador desde la vigente aprobada u observada, con motivo obligatorio (§2.3).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma, runInTransaction } from "@/server/db";
import { startNewVersion } from "@/server/sales-control/start-new-version";
import { getSessionUser } from "@/server/session";
import {
  type VersionReasonInput,
  versionReasonSchema,
} from "../schemas/version-schemas";

export async function createCvVersion(
  input: VersionReasonInput,
): Promise<ActionResult<{ versionNumber: number }>> {
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
      startNewVersion(tx, user, parsed.data),
    );
  } catch (error) {
    return toActionError(error, "createCvVersion");
  }
}
