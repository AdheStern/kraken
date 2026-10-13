// src/features/hours/queries/bag-records.ts
// Lectura común de bolsas: selección mínima y paso a BagSummary con las cifras y el riesgo del dominio.
import { classifyBagRisk } from "@/domain/hours/classify-bag-risk";
import { daysUntilExpiry } from "@/domain/hours/expiry";
import {
  type MovementTotals,
  summarizeBag,
} from "@/domain/hours/summarize-bag";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import type { BagAlertSettings } from "@/server/hours/bag-alert-settings";
import type { BagSummary } from "../types";

export const BAG_SELECT = {
  id: true,
  status: true,
  modality: true,
  scope: true,
  expiresOn: true,
  balanceMinutes: true,
  customer: { select: { id: true, name: true } },
  areas: { select: { areaId: true, area: { select: { code: true } } } },
  cvLine: {
    select: {
      description: true,
      version: {
        select: { number: true, cv: { select: { id: true, code: true } } },
      },
    },
  },
} satisfies Prisma.HourBagSelect;

export type BagRecord = Prisma.HourBagGetPayload<{
  select: typeof BAG_SELECT;
}>;

export async function loadMovementTotals(
  bagIds: readonly string[],
): Promise<Map<string, MovementTotals>> {
  const groups = await prisma.hourMovement.groupBy({
    by: ["bagId", "kind"],
    where: { bagId: { in: [...bagIds] } },
    _sum: { minutes: true },
  });
  const totals = new Map<string, MovementTotals>();
  for (const group of groups) {
    const bag = totals.get(group.bagId) ?? {};
    bag[group.kind] = group._sum.minutes ?? 0;
    totals.set(group.bagId, bag);
  }
  return totals;
}

export function toBagSummary(
  record: BagRecord,
  totals: MovementTotals,
  today: string,
  settings: BagAlertSettings,
): BagSummary {
  const figures = summarizeBag(totals, record.balanceMinutes);
  const expiresOn = record.expiresOn?.toISOString().slice(0, 10) ?? null;
  const risk = classifyBagRisk(
    { status: record.status, expiresOn, ...figures },
    today,
    settings,
  );
  const { version } = record.cvLine;
  return {
    id: record.id,
    cvId: version.cv.id,
    cvLabel: toCvVersionLabel(version.cv.code, version.number),
    lineDescription: record.cvLine.description,
    customerId: record.customer.id,
    customerName: record.customer.name,
    modality: record.modality,
    scope: record.scope,
    areaCodes: record.areas.map((a) => a.area.code).sort(),
    status: record.status,
    ...figures,
    expiresOn,
    daysToExpiry: expiresOn ? daysUntilExpiry(expiresOn, today) : null,
    riskGroup: risk.group,
    riskReasons: risk.reasons,
  };
}
