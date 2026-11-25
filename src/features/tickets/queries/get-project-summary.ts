// src/features/tickets/queries/get-project-summary.ts
// Resumen operativo de un proyecto sobre los tickets que el usuario ve (todos, también los cerrados hace
// tiempo): avance, horas, SLA, desglose por persona y bolsa y horas por semana (AGENTS.md §2.6, §6, regla 7).
import { toBagName } from "@/domain/hours/bag-name";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import {
  type ProjectSummary,
  summarizeProject,
} from "@/domain/tickets/summarize-project";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import type { Person } from "../types";

type Row = { id: string; label: string; minutes: number };

export type ProjectSummaryView = Omit<ProjectSummary, "byPerson" | "byBag"> & {
  people: (Person & { minutes: number; entries: number })[];
  byBag: Row[];
};

export async function getProjectSummary(
  user: SessionUser,
  projectId: string,
): Promise<ProjectSummaryView> {
  const tickets = await prisma.ticket.findMany({
    where: { AND: [scopeTicketQuery(user), { projectId }] },
    select: {
      status: true,
      createdAt: true,
      resolvedAt: true,
      timeEntries: {
        select: {
          subtaskId: true,
          startedAt: true,
          endedAt: true,
          user: {
            select: {
              userId: true,
              user: { select: { name: true, image: true } },
            },
          },
        },
      },
      hourMovements: {
        where: { kind: { in: ["CONSUMO", "REVERSO"] } },
        select: { bagId: true, minutes: true, bag: { select: BAG_LABEL } },
      },
      pendingHours: {
        where: { status: "PENDIENTE" },
        select: { insideMinutes: true, outsideMinutes: true },
      },
      slaMeasurements: { select: { status: true } },
    },
  });
  const { byPerson, byBag, ...summary } = summarizeProject(
    tickets.map((t) => ({
      status: t.status,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
      entries: t.timeEntries.map((e) => ({ ...e, personId: e.user.userId })),
      movements: t.hourMovements,
      pendingMinutes: t.pendingHours.reduce(
        (sum, p) => sum + p.insideMinutes + p.outsideMinutes,
        0,
      ),
      slaOutcomes: t.slaMeasurements.map((m) => m.status),
    })),
  );
  const people = new Map(
    tickets.flatMap((t) => t.timeEntries.map((e) => [e.user.userId, e.user])),
  );
  const bags = new Map(
    tickets.flatMap((t) => t.hourMovements.map((m) => [m.bagId, m.bag])),
  );
  return {
    ...summary,
    people: [...byPerson]
      .map(([id, totals]) => ({
        id,
        name: people.get(id)?.user.name ?? "—",
        image: people.get(id)?.user.image ?? null,
        ...totals,
      }))
      .sort((a, b) => b.minutes - a.minutes),
    byBag: [...byBag]
      .map(([id, minutes]) => {
        const bag = bags.get(id);
        const line = bag?.cvLine;
        return {
          id,
          minutes,
          label: line
            ? `${toCvVersionLabel(line.version.cv.code, line.version.number)} · ${toBagName(bag?.name ?? null, line.description)}`
            : "Bolsa",
        };
      })
      .sort((a, b) => b.minutes - a.minutes),
  };
}

const BAG_LABEL = {
  name: true,
  cvLine: {
    select: {
      description: true,
      version: { select: { number: true, cv: { select: { code: true } } } },
    },
  },
} as const;
