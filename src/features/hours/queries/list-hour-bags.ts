// src/features/hours/queries/list-hour-bags.ts
// Bolsas visibles para el usuario, con cifras y riesgo, ordenadas para el seguimiento (AGENTS.md §2.4, §5).
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { getBagAlertSettings } from "@/server/hours/bag-alert-settings";
import type { BagFilters, BagSummary } from "../types";
import { BAG_SELECT, loadMovementTotals, toBagSummary } from "./bag-records";

// LIMITACIÓN: sin paginación; son ~40 usuarios y unos cientos de bolsas vigentes (AGENTS.md §3).
const MAX_BAGS = 500;

export async function listHourBags(
  user: SessionUser,
  filters: BagFilters = {},
): Promise<BagSummary[]> {
  const records = await prisma.hourBag.findMany({
    where: {
      AND: [
        scopeHourBagQuery(user),
        filters.customerId ? { customerId: filters.customerId } : {},
        filters.status ? { status: filters.status } : {},
      ],
    },
    select: BAG_SELECT,
    orderBy: { createdAt: "desc" },
    take: MAX_BAGS,
  });
  const [totals, settings] = await Promise.all([
    loadMovementTotals(records.map((r) => r.id)),
    getBagAlertSettings(),
  ]);
  const today = toBusinessDate(systemClock.now());
  return records
    .map((r) => toBagSummary(r, totals.get(r.id) ?? {}, today, settings))
    .sort(byUrgency);
}

// POR QUÉ: primero lo que se agota (más % consumido) y, a igual consumo, lo que vence antes.
function byUrgency(a: BagSummary, b: BagSummary): number {
  return (
    b.consumedPct - a.consumedPct ||
    (a.daysToExpiry ?? Number.MAX_SAFE_INTEGER) -
      (b.daysToExpiry ?? Number.MAX_SAFE_INTEGER)
  );
}
