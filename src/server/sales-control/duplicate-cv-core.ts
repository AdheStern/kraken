// src/server/sales-control/duplicate-cv-core.ts
// Crea un CV nuevo (número nuevo, v1 en BORRADOR con fecha de hoy) a partir de una versión de otro CV. Lo usan
// «Duplicar» (todas las líneas) y «Crear CV de renovación» (las líneas elegidas, con la vigencia siguiente),
// AGENTS.md §2.1 "Productividad" y "Vigencia".
import {
  toBusinessDate,
  toBusinessYear,
} from "@/domain/calendar/business-date";
import { toCvCode } from "@/domain/sales-control/cv-code";
import type { CvVersion } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { allocateCvNumber } from "./allocate-cv-number";
import { copyVersionContent } from "./copy-version-content";
import { recomputeVersionTotals } from "./recompute-version-totals";

type Source = {
  cityId: string;
  customerId: string;
  city: { code: string };
};

type SourceVersion = CvVersion & { sellers: { userId: string }[] };

export type CopyMode =
  | { kind: "DUPLICAR" }
  | { kind: "RENOVAR"; lineIds: readonly string[] };

export async function createCvCopy(
  tx: Tx,
  actorId: string,
  source: Source,
  version: SourceVersion,
  mode: CopyMode,
  now: Date,
): Promise<{ id: string; code: string }> {
  const year = toBusinessYear(now);
  const number = await allocateCvNumber(tx, source.cityId, year);
  const sellerIds = [
    ...new Set([actorId, ...version.sellers.map((s) => s.userId)]),
  ];
  // REGLA: la OC, su fecha y la entrega pertenecen al pedido anterior; no se copian.
  const cv = await tx.cv.create({
    data: {
      number,
      year,
      code: toCvCode({ number, cityCode: source.city.code, year }),
      cityId: source.cityId,
      customerId: source.customerId,
      createdById: actorId,
      versions: {
        create: {
          number: 1,
          title:
            mode.kind === "RENOVAR"
              ? `Renovación: ${version.title}`
              : version.title,
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
          createdById: actorId,
          sellers: { create: sellerIds.map((userId) => ({ userId })) },
        },
      },
    },
    include: { versions: { select: { id: true } } },
  });
  const targetId = cv.versions[0].id;
  if (mode.kind === "DUPLICAR")
    await copyVersionContent(tx, version.id, targetId, { sameSale: false });
  else {
    await copyVersionContent(tx, version.id, targetId, {
      sameSale: false,
      renewLineIds: mode.lineIds,
    });
    await recomputeVersionTotals(tx, targetId);
  }
  return { id: cv.id, code: cv.code };
}
