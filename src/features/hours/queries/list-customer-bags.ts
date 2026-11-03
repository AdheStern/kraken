// src/features/hours/queries/list-customer-bags.ts
// Bolsas de la empresa de una cuenta del portal, si su configuración lo permite: saldo, consumo y vencimiento
// con las mismas cifras que ve DIMA (AGENTS.md §2.11, §2.4).
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCustomerHourBagQuery } from "@/server/authz/scope-customer-hour-bag-query";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { getBagAlertSettings } from "@/server/hours/bag-alert-settings";
import type { BagSummary } from "../types";
import { BAG_SELECT, loadMovementTotals, toBagSummary } from "./bag-records";

const MAX_BAGS = 200;
const ENDED = new Set(["VENCIDA", "CERRADA"]);

export async function listCustomerBags(
  user: SessionUser,
): Promise<BagSummary[]> {
  const records = await prisma.hourBag.findMany({
    where: scopeCustomerHourBagQuery(user),
    select: BAG_SELECT,
    orderBy: { createdAt: "desc" },
    take: MAX_BAGS,
  });
  const [totals, settings] = await Promise.all([
    loadMovementTotals(records.map((r) => r.id)),
    getBagAlertSettings(),
  ]);
  const today = toBusinessDate(systemClock.now());
  // POR QUÉ: primero las vigentes; las vencidas o cerradas quedan como historial al final.
  return records
    .map((r) => toBagSummary(r, totals.get(r.id) ?? {}, today, settings))
    .sort((a, b) => Number(ENDED.has(a.status)) - Number(ENDED.has(b.status)));
}
