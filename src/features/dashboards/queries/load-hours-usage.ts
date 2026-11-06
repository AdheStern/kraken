// src/features/dashboards/queries/load-hours-usage.ts
// Uso de las horas vendidas de las bolsas de horas activas en el periodo, por cliente, tecnología y área de su
// línea, más lo pendiente sin bolsa por cliente (decisión 2026-11-05, AGENTS.md §6). Alcance de scopeHourBagQuery y,
// para lo pendiente, de los tickets. Sin montos.
import {
  hoursUsageBreakdown,
  type UsageBag,
} from "@/domain/dashboards/hours-usage";
import type { MovementTotals } from "@/domain/hours/summarize-bag";
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";
import { prisma } from "@/server/db";
import type { HoursUsageView } from "../types";
import { type OpsFilters, ticketFilter } from "./load-hours-flow";

const WITHOUT = "sin";

export async function loadHoursUsage(
  user: SessionUser,
  filters: OpsFilters,
): Promise<HoursUsageView> {
  const inPeriod = { gte: filters.start, lt: filters.end };
  // POR QUÉ: el uso es de toda la vida de la bolsa; entran las vigentes y las que se movieron en el periodo.
  const bags = await prisma.hourBag.findMany({
    where: {
      AND: [
        scopeHourBagQuery(user),
        { kind: "HORAS", createdAt: { lt: filters.end } },
        filters.areaId ? { areas: { some: { areaId: filters.areaId } } } : {},
        {
          OR: [
            { status: { in: ["ACTIVA", "AGOTADA"] } },
            { movements: { some: { createdAt: inPeriod } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      customer: { select: { id: true, name: true } },
      cvLine: {
        select: {
          technology: { select: { id: true, name: true } },
          area: { select: { id: true, code: true } },
        },
      },
    },
  });
  const movements = await prisma.hourMovement.groupBy({
    by: ["bagId", "kind"],
    where: { bagId: { in: bags.map((b) => b.id) } },
    _sum: { minutes: true },
  });
  const totals = new Map<string, MovementTotals>();
  for (const m of movements)
    totals.set(m.bagId, {
      ...totals.get(m.bagId),
      [m.kind]: m._sum.minutes ?? 0,
    });
  const of = (pick: (b: (typeof bags)[number]) => [string, string]) =>
    bags.map((b): UsageBag => {
      const [key, label] = pick(b);
      return { key, label, totals: totals.get(b.id) ?? {} };
    });
  return {
    byCustomer: hoursUsageBreakdown(
      of((b) => [b.customer.id, b.customer.name]),
      await pendingByCustomer(user, filters),
    ),
    byTechnology: hoursUsageBreakdown(
      of((b) => {
        const t = b.cvLine.technology;
        return t ? [t.id, t.name] : [WITHOUT, "Sin tecnología"];
      }),
    ),
    byArea: hoursUsageBreakdown(
      of((b) => {
        const a = b.cvLine.area;
        return a ? [a.id, a.code] : [WITHOUT, "Sin área"];
      }),
    ),
  };
}

async function pendingByCustomer(
  user: SessionUser,
  filters: OpsFilters,
): Promise<Map<string, number>> {
  const rows = await prisma.pendingHours.findMany({
    where: { status: "PENDIENTE", ticket: ticketFilter(user, filters) },
    select: {
      insideMinutes: true,
      outsideMinutes: true,
      ticket: { select: { customerId: true } },
    },
  });
  const byCustomer = new Map<string, number>();
  for (const r of rows)
    byCustomer.set(
      r.ticket.customerId,
      (byCustomer.get(r.ticket.customerId) ?? 0) +
        r.insideMinutes +
        r.outsideMinutes,
    );
  return byCustomer;
}
