// src/features/sales-control/actions/duplicate-cv.ts
// Duplica un CV visible con número nuevo: copia la versión más reciente (cabecera, lotes, líneas y leasing)
// a una v1 en BORRADOR con fecha de hoy. Pensado para los CV mensuales de licencias y Azure (AGENTS.md §2.1).
"use server";

import {
  toBusinessDate,
  toBusinessYear,
} from "@/domain/calendar/business-date";
import { toCvCode } from "@/domain/sales-control/cv-code";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canCreateCv } from "@/server/authz/cv-permissions";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { systemClock } from "@/server/clock";
import { prisma, runInTransaction } from "@/server/db";
import { allocateCvNumber } from "@/server/sales-control/allocate-cv-number";
import { copyVersionContent } from "@/server/sales-control/copy-version-content";
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
      const now = systemClock.now();
      const year = toBusinessYear(now);
      const number = await allocateCvNumber(tx, source.cityId, year);
      const sellerIds = [
        ...new Set([user.id, ...version.sellers.map((s) => s.userId)]),
      ];
      // REGLA: la OC, su fecha y la entrega pertenecen al pedido anterior; no se copian.
      const cv = await tx.cv.create({
        data: {
          number,
          year,
          code: toCvCode({ number, cityCode: source.city.code, year }),
          cityId: source.cityId,
          customerId: source.customerId,
          createdById: user.id,
          versions: {
            create: {
              number: 1,
              title: version.title,
              issuedOn: new Date(toBusinessDate(now)),
              presalesId: version.presalesId,
              postsalesId: version.postsalesId,
              mainTechnologyId: version.mainTechnologyId,
              serviceTypeId: version.serviceTypeId,
              isNewTechnology: version.isNewTechnology,
              endCustomerId: version.endCustomerId,
              customerSnapshot: version.customerSnapshot ?? {},
              paymentTerms: version.paymentTerms,
              notes: version.notes,
              costFxRate: version.costFxRate,
              saleFxRate: version.saleFxRate,
              officialFxRate: version.officialFxRate,
              totalCostUsd: version.totalCostUsd,
              totalSaleUsd: version.totalSaleUsd,
              createdById: user.id,
              sellers: { create: sellerIds.map((userId) => ({ userId })) },
            },
          },
        },
        include: { versions: { select: { id: true } } },
      });
      await copyVersionContent(tx, version.id, cv.versions[0].id, {
        sameSale: false,
      });
      return cv.id;
    });
    return actionOk({ cvId: newCvId });
  } catch (error) {
    return toActionError(error, "duplicateCv");
  }
}
