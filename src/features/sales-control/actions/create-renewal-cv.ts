// src/features/sales-control/actions/create-renewal-cv.ts
// Crea el CV de renovación de un CV aprobado: número nuevo, solo las líneas con vigencia elegidas y su periodo
// siguiente, en BORRADOR (AGENTS.md §2.1 "Vigencia", renovación en un clic, decisión 2026-11-05).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canCreateCv } from "@/server/authz/cv-permissions";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { systemClock } from "@/server/clock";
import { prisma, runInTransaction } from "@/server/db";
import { createCvCopy } from "@/server/sales-control/duplicate-cv-core";
import { getSessionUser } from "@/server/session";

const schema = z.object({
  cvId: z.uuid(),
  lineIds: z.array(z.uuid()).min(1, "Elige al menos una línea para renovar."),
});

export async function createRenewalCv(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ cvId: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canCreateCv(user))
    return actionError("FORBIDDEN", "Tu rol no permite crear CV.");
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { cvId, lineIds } = parsed.data;
  // REGLA: se renueva lo vendido: la versión aprobada vigente del CV, nunca un borrador.
  const source = await prisma.cv.findFirst({
    where: { AND: [scopeCvQuery(user), { id: cvId, voidedAt: null }] },
    include: {
      city: true,
      versions: {
        where: { status: "APROBADA" },
        take: 1,
        include: {
          sellers: true,
          lines: {
            where: { id: { in: lineIds }, kind: "ITEM" },
            select: { id: true, coverageEnd: true },
          },
        },
      },
    },
  });
  const version = source?.versions[0];
  if (!source || !version)
    return actionError(
      "NOT_FOUND",
      "El CV no tiene una versión aprobada vigente o no lo puedes ver.",
    );
  if (
    version.lines.length !== lineIds.length ||
    version.lines.some((l) => !l.coverageEnd)
  )
    return actionError(
      "VALIDATION",
      "Solo se renuevan líneas de la versión aprobada con fin de vigencia.",
    );

  try {
    const newCvId = await runInTransaction(async (tx) => {
      const cv = await createCvCopy(
        tx,
        user.id,
        source,
        version,
        { kind: "RENOVAR", lineIds },
        systemClock.now(),
      );
      await recordAudit(tx, {
        actorId: user.id,
        entity: "cv.cv",
        entityId: cv.id,
        action: "RENOVAR",
        after: { code: cv.code, from: version.id, lineIds },
      });
      return cv.id;
    });
    return actionOk({ cvId: newCvId });
  } catch (error) {
    return toActionError(error, "createRenewalCv");
  }
}
