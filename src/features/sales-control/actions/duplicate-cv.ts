// src/features/sales-control/actions/duplicate-cv.ts
// Duplica un CV visible con número nuevo: copia la versión más reciente (cabecera, lotes, líneas y leasing)
// a una v1 en BORRADOR con fecha de hoy. Pensado para los CV mensuales de licencias y Azure (AGENTS.md §2.1).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canCreateCv } from "@/server/authz/cv-permissions";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { systemClock } from "@/server/clock";
import { prisma, runInTransaction } from "@/server/db";
import { createCvCopy } from "@/server/sales-control/duplicate-cv-core";
import { getSessionUser } from "@/server/session";

export async function duplicateCv(
  cvId: string,
): Promise<ActionResult<{ cvId: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canCreateCv(user))
    return actionError("FORBIDDEN", "Tu rol no permite crear CV.");
  const source = await prisma.cv.findFirst({
    where: { AND: [scopeCvQuery(user), { id: cvId }] },
    include: {
      city: true,
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        include: { sellers: true },
      },
    },
  });
  const version = source?.versions[0];
  if (!source || !version)
    return actionError("NOT_FOUND", "El CV ya no existe o no lo puedes ver.");

  try {
    const newCvId = await runInTransaction(async (tx) => {
      const cv = await createCvCopy(
        tx,
        user.id,
        source,
        version,
        { kind: "DUPLICAR" },
        systemClock.now(),
      );
      await recordAudit(tx, {
        actorId: user.id,
        entity: "cv.cv",
        entityId: cv.id,
        action: "DUPLICAR",
        after: { code: cv.code, from: version.id },
      });
      return cv.id;
    });
    return actionOk({ cvId: newCvId });
  } catch (error) {
    return toActionError(error, "duplicateCv");
  }
}
