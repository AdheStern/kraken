// src/features/dashboards/queries/load-ticket-kpis.ts
// Indicadores de tickets del periodo: SLA de los resueltos, abiertos por estado, mediana de resolución,
// registros tardíos y tiempo fuera de horario (AGENTS.md §2.6, §2.7 y §6). Alcance de scopeTicketQuery.
import { toBusinessDate } from "@/domain/calendar/business-date";
import {
  lateEntriesPct,
  medianResolutionMinutes,
  outsideHoursShare,
  slaCompliance,
} from "@/domain/dashboards/ticket-kpis";
import type { SessionUser } from "@/server/authz/roles";
import { loadBusinessCalendar } from "@/server/calendar/load-business-calendar";
import { prisma } from "@/server/db";
import type { OperationsDashboard } from "../types";
import { type OpsFilters, ticketFilter } from "./load-hours-flow";

type TicketKpis = Pick<
  OperationsDashboard,
  | "sla"
  | "openTickets"
  | "medianResolutionMinutes"
  | "lateEntriesPct"
  | "outsideHoursPct"
>;

const OPEN = [
  "NUEVO",
  "ASIGNADO",
  "EN_PROGRESO",
  "EN_ESPERA_CLIENTE",
  "RESUELTO",
] as const;

export async function loadTicketKpis(
  user: SessionUser,
  filters: OpsFilters,
): Promise<TicketKpis> {
  const inPeriod = { gte: filters.start, lt: filters.end };
  const tickets = ticketFilter(user, filters);
  const [measurements, open, resolved, entries] = await Promise.all([
    prisma.slaMeasurement.findMany({
      where: { ticket: { AND: [tickets, { resolvedAt: inPeriod }] } },
      select: { kind: true, status: true },
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      where: { AND: [tickets, { status: { in: [...OPEN] } }] },
      _count: { _all: true },
    }),
    prisma.ticket.findMany({
      where: { AND: [tickets, { resolvedAt: inPeriod }] },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.timeEntry.findMany({
      where: { endedAt: { not: null }, startedAt: inPeriod, ticket: tickets },
      select: {
        startedAt: true,
        endedAt: true,
        isLate: true,
        ticket: { select: { cityId: true } },
      },
    }),
  ]);
  const of = (kind: "PRIMERA_RESPUESTA" | "RESOLUCION") =>
    slaCompliance(
      measurements.filter((m) => m.kind === kind).map((m) => m.status),
    );
  return {
    sla: {
      firstResponse: of("PRIMERA_RESPUESTA"),
      resolution: of("RESOLUCION"),
    },
    openTickets: OPEN.map((status) => ({
      status,
      count: open.find((g) => g.status === status)?._count._all ?? 0,
    })),
    medianResolutionMinutes: medianResolutionMinutes(
      resolved.flatMap((t) =>
        t.resolvedAt
          ? [{ createdAt: t.createdAt, resolvedAt: t.resolvedAt }]
          : [],
      ),
    ),
    lateEntriesPct: lateEntriesPct(entries),
    outsideHoursPct: await outsidePct(entries, filters),
  };
}

// TRAMPA: cada registro se parte con el calendario de la ciudad de su ticket, no la del ingeniero (§2.5).
async function outsidePct(
  entries: readonly {
    startedAt: Date;
    endedAt: Date | null;
    ticket: { cityId: string };
  }[],
  filters: OpsFilters,
): Promise<number | null> {
  const range = {
    from: toBusinessDate(filters.start),
    to: toBusinessDate(filters.end),
  };
  const cityIds = [...new Set(entries.map((e) => e.ticket.cityId))];
  const calendars = new Map(
    await Promise.all(
      cityIds.map(
        async (cityId) =>
          [cityId, await loadBusinessCalendar(prisma, cityId, range)] as const,
      ),
    ),
  );
  return outsideHoursShare(
    entries.flatMap((e) => {
      const calendar = calendars.get(e.ticket.cityId);
      return e.endedAt && calendar
        ? [{ start: e.startedAt, end: e.endedAt, calendar }]
        : [];
    }),
  ).outsidePct;
}
