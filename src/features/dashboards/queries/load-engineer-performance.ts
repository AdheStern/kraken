// src/features/dashboards/queries/load-engineer-performance.ts
// Carga y resume el desempeño de los ingenieros visibles para el usuario en un periodo (AGENTS.md §6). Qué
// ingenieros ve lo decide scopeEngineerQuery y qué tickets, scopeTicketQuery (regla 7).

import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { TimeInterval } from "@/domain/calendar/split-by-business-hours";
import {
  type EngineerEntry,
  type EngineerPerformance,
  summarizeEngineer,
} from "@/domain/dashboards/engineer-performance";
import { summarizeTicketWork } from "@/domain/tickets/summarize-ticket-work";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { loadBusinessCalendar } from "@/server/calendar/load-business-calendar";
import { prisma } from "@/server/db";
import { loadUtilization } from "./load-utilization";

export type EngineerFacts = {
  userId: string;
  name: string;
  performance: EngineerPerformance;
  entries: EngineerEntry[];
  tickets: Awaited<ReturnType<typeof loadTickets>>;
};

export async function loadEngineerPerformance(
  user: SessionUser,
  window: TimeInterval,
  areaId: string | null,
  engineerId?: string,
): Promise<EngineerFacts[]> {
  // POR QUÉ: la utilización ya resuelve el alcance de ingenieros y su capacidad hábil; se reutiliza tal cual.
  const engineers = (await loadUtilization(user, window, areaId)).filter(
    (e) => !engineerId || e.userId === engineerId,
  );
  const ids = engineers.map((e) => e.userId);
  // TRAMPA: en serie; en una consulta grande en paralelo el pool se agota en desarrollo.
  const rawEntries = await loadEntries(ids, window);
  const tickets = await loadTickets(user, ids, window, [
    ...new Set(rawEntries.map((e) => e.ticketId)),
  ]);
  const calendars = await loadCalendars(rawEntries, window);
  const subtasks = await prisma.subtask.groupBy({
    by: ["assigneeId"],
    where: {
      assigneeId: { in: ids },
      status: "COMPLETADA",
      completedAt: { gte: window.start, lt: window.end },
    },
    _count: { _all: true },
  });
  return engineers.map((engineer) => {
    const entries = rawEntries
      .filter((e) => e.userId === engineer.userId)
      .map(
        (e): EngineerEntry => ({
          ...e,
          calendar: calendars.get(e.cityId) ?? NO_HOURS,
        }),
      );
    const mine = tickets.filter(
      (t) =>
        t.ownerId === engineer.userId ||
        entries.some((e) => e.ticketId === t.id),
    );
    const performance = summarizeEngineer({
      window,
      capacityMinutes: engineer.capacityMinutes,
      entries,
      tickets: mine.map((t) => ({
        ...t,
        isOwner: t.ownerId === engineer.userId,
      })),
      subtasksCompleted:
        subtasks.find((s) => s.assigneeId === engineer.userId)?._count._all ??
        0,
    });
    return {
      userId: engineer.userId,
      name: engineer.name,
      performance,
      entries,
      tickets: mine,
    };
  });
}

// POR QUÉ: una ciudad sin horario no deja cerrar sus tickets (§2.5); aquí todo su tiempo cuenta fuera de horario.
const NO_HOURS: BusinessCalendar = { slots: [], holidays: new Set() };

async function loadEntries(ids: string[], window: TimeInterval) {
  const rows = await prisma.timeEntry.findMany({
    where: {
      userId: { in: ids },
      endedAt: { gt: window.start },
      startedAt: { lt: window.end },
    },
    select: {
      userId: true,
      ticketId: true,
      subtaskId: true,
      startedAt: true,
      endedAt: true,
      source: true,
      isLate: true,
      ticket: { select: { cityId: true } },
    },
  });
  return rows.flatMap(({ startedAt, endedAt, ticket, ...e }) =>
    endedAt
      ? [{ ...e, start: startedAt, end: endedAt, cityId: ticket.cityId }]
      : [],
  );
}

async function loadTickets(
  user: SessionUser,
  ids: string[],
  window: TimeInterval,
  workedTicketIds: string[],
) {
  const inWindow = { gte: window.start, lt: window.end };
  const rows = await prisma.ticket.findMany({
    where: {
      AND: [
        scopeTicketQuery(user),
        {
          OR: [
            { id: { in: workedTicketIds } },
            {
              ownerId: { in: ids },
              OR: [
                { status: { notIn: ["CERRADO", "CANCELADO"] } },
                { createdAt: inWindow },
                { resolvedAt: inWindow },
                { closedAt: inWindow },
              ],
            },
          ],
        },
      ],
    },
    orderBy: { number: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      ownerId: true,
      createdAt: true,
      resolvedAt: true,
      closedAt: true,
      customer: { select: { name: true } },
      subtasks: { select: { assigneeId: true } },
      slaMeasurements: { select: { status: true } },
      conformities: {
        select: { isSatisfied: true, rating: true, createdAt: true },
      },
      hourMovements: {
        where: { kind: { in: ["CONSUMO", "REVERSO"] } },
        select: { bagId: true, minutes: true },
      },
    },
  });
  return rows.map(({ slaMeasurements, hourMovements, conformities, ...t }) => ({
    ...t,
    slaOutcomes: slaMeasurements.map((m) => m.status),
    conformities: conformities.map(({ createdAt, ...c }) => ({
      ...c,
      at: createdAt,
    })),
    // REGLA: lo descontado tiene una sola definición (summarizeTicketWork, §6).
    chargedMinutes: summarizeTicketWork([], hourMovements).chargedMinutes,
  }));
}

async function loadCalendars(
  entries: readonly { cityId: string }[],
  window: TimeInterval,
): Promise<Map<string, BusinessCalendar>> {
  const range = {
    from: toBusinessDate(window.start),
    to: toBusinessDate(window.end),
  };
  const calendars = new Map<string, BusinessCalendar>();
  for (const cityId of new Set(entries.map((e) => e.cityId)))
    calendars.set(cityId, await loadBusinessCalendar(prisma, cityId, range));
  return calendars;
}
