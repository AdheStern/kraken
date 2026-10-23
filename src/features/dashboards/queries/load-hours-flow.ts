// src/features/dashboards/queries/load-hours-flow.ts
// Horas del periodo: movimientos de las bolsas visibles (vendido, consumido ponderado, vencido), tiempo real de
// los tickets cerrados y lo pendiente sin bolsa (AGENTS.md §2.4, §2.6 y §6).
import { summarizeHoursFlow } from "@/domain/dashboards/hours-kpis";
import type { MovementTotals } from "@/domain/hours/summarize-bag";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import type { HoursFlowView } from "../types";

const MINUTE_MS = 60_000;

export type OpsFilters = {
  start: Date;
  end: Date;
  areaId: string | null;
  cityId: string | null;
};

// REGLA: los CV de saldo inicial sí cuentan en los operativos (§6); por eso aquí no se excluyen.
export async function loadHoursFlow(
  user: SessionUser,
  filters: OpsFilters,
): Promise<HoursFlowView> {
  const inPeriod = { gte: filters.start, lt: filters.end };
  const tickets = ticketFilter(user, filters);
  const [movements, entries, pending] = await Promise.all([
    prisma.hourMovement.groupBy({
      by: ["kind"],
      where: {
        createdAt: inPeriod,
        bag: {
          AND: [
            scopeHourBagQuery(user),
            filters.areaId
              ? { areas: { some: { areaId: filters.areaId } } }
              : {},
          ],
        },
      },
      _sum: { minutes: true },
    }),
    prisma.timeEntry.findMany({
      where: {
        endedAt: { not: null },
        ticket: { AND: [tickets, { closedAt: inPeriod }] },
      },
      select: { startedAt: true, endedAt: true },
    }),
    prisma.pendingHours.aggregate({
      where: { status: "PENDIENTE", ticket: tickets },
      _sum: { insideMinutes: true, outsideMinutes: true },
    }),
  ]);
  const totals: MovementTotals = Object.fromEntries(
    movements.map((m) => [m.kind, m._sum.minutes ?? 0]),
  );
  const realMs = entries.reduce(
    (acc, e) => acc + ((e.endedAt?.getTime() ?? 0) - e.startedAt.getTime()),
    0,
  );
  return {
    ...summarizeHoursFlow(totals, Math.floor(realMs / MINUTE_MS)),
    pendingMinutes:
      (pending._sum.insideMinutes ?? 0) + (pending._sum.outsideMinutes ?? 0),
  };
}

export function ticketFilter(
  user: SessionUser,
  filters: Pick<OpsFilters, "areaId" | "cityId">,
): Prisma.TicketWhereInput {
  return {
    AND: [
      scopeTicketQuery(user),
      filters.areaId ? { areas: { some: { areaId: filters.areaId } } } : {},
      filters.cityId ? { cityId: filters.cityId } : {},
    ],
  };
}
