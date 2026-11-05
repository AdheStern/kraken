// src/server/sales-control/load-renewal-lines.ts
// Líneas de las versiones aprobadas vigentes cuya vigencia termina entre hoy y el umbral mayor, con los avisos
// que ya recibió su linaje (job renewals.notify, AGENTS.md §2.1 "Vigencia"). Proceso del sistema: sin alcance.
import type { PrismaClient } from "@/generated/prisma/client";

export type RenewalLine = {
  rootLineId: string;
  description: string;
  areaId: string | null;
  coverageEnd: string;
  cvId: string;
  cvCode: string;
  versionNumber: number;
  customerName: string;
  sellerIds: string[];
  sentDays: number[];
};

export async function loadRenewalLines(
  db: PrismaClient,
  from: string,
  until: string,
): Promise<RenewalLine[]> {
  const lines = await db.cvLine.findMany({
    where: {
      kind: "ITEM",
      coverageEnd: {
        gte: new Date(`${from}T00:00:00Z`),
        lte: new Date(`${until}T00:00:00Z`),
      },
      // REGLA: el CV de saldo inicial no es una venta (§6) y uno anulado no se renueva.
      version: {
        status: "APROBADA",
        cv: { isOpeningBalance: false, voidedAt: null },
      },
    },
    orderBy: { position: "asc" },
    select: {
      id: true,
      originLineId: true,
      description: true,
      areaId: true,
      coverageEnd: true,
      version: {
        select: {
          number: true,
          sellers: { select: { userId: true } },
          cv: {
            select: {
              id: true,
              code: true,
              customer: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  const roots = lines.map((l) => l.originLineId ?? l.id);
  const sent = await db.cvRenewalNotice.findMany({
    where: { originLineId: { in: roots } },
    select: { originLineId: true, days: true },
  });
  return lines.map((line, index) => ({
    rootLineId: roots[index],
    description: line.description,
    areaId: line.areaId,
    coverageEnd: line.coverageEnd?.toISOString().slice(0, 10) ?? from,
    cvId: line.version.cv.id,
    cvCode: line.version.cv.code,
    versionNumber: line.version.number,
    customerName: line.version.cv.customer.name,
    sellerIds: line.version.sellers.map((s) => s.userId),
    sentDays: sent
      .filter((s) => s.originLineId === roots[index])
      .map((s) => s.days),
  }));
}
