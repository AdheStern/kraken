// src/features/tickets/queries/get-ticket-summary.ts
// Resumen de un ticket cerrado: horas trabajadas y descontadas, desglose por persona, subtarea y bolsa, y su
// actividad; null si no es visible o no está cerrado (AGENTS.md §2.6, §2.9 "Tickets: ver").
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { summarizeTicketWork } from "@/domain/tickets/summarize-ticket-work";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import type { Person } from "../types";

type Row = { id: string; label: string; minutes: number };

export type TicketSummary = {
  realMinutes: number;
  chargedMinutes: number;
  pendingMinutes: number;
  durationMinutes: number | null;
  entries: { total: number; manual: number; late: number };
  subtasks: { done: number; total: number };
  comments: number;
  people: (Person & { minutes: number; entries: number })[];
  bySubtask: Row[];
  byBag: Row[];
};

const PERSON = {
  select: { userId: true, user: { select: { name: true, image: true } } },
} as const;

export async function getTicketSummary(
  user: SessionUser,
  ticketId: string,
): Promise<TicketSummary | null> {
  const ticket = await prisma.ticket.findFirst({
    where: {
      AND: [{ id: ticketId, status: "CERRADO" }, scopeTicketQuery(user)],
    },
    select: {
      createdAt: true,
      closedAt: true,
      _count: { select: { comments: true } },
      subtasks: { select: { id: true, title: true, status: true } },
      timeEntries: {
        select: {
          subtaskId: true,
          startedAt: true,
          endedAt: true,
          source: true,
          isLate: true,
          user: PERSON,
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
    },
  });
  if (!ticket) return null;
  const work = summarizeTicketWork(
    ticket.timeEntries.map((e) => ({ ...e, personId: e.user.userId })),
    ticket.hourMovements,
  );
  const people = new Map(
    ticket.timeEntries.map((e) => [e.user.userId, e.user]),
  );
  const subtaskTitles = new Map(ticket.subtasks.map((s) => [s.id, s.title]));
  const bagLabels = new Map(
    ticket.hourMovements.map((m) => [m.bagId, bagLabel(m.bag)]),
  );
  return {
    realMinutes: work.realMinutes,
    chargedMinutes: work.chargedMinutes,
    pendingMinutes: ticket.pendingHours.reduce(
      (sum, p) => sum + p.insideMinutes + p.outsideMinutes,
      0,
    ),
    durationMinutes: ticket.closedAt
      ? Math.round(
          (ticket.closedAt.getTime() - ticket.createdAt.getTime()) / 60_000,
        )
      : null,
    entries: {
      total: ticket.timeEntries.length,
      manual: ticket.timeEntries.filter((e) => e.source === "MANUAL").length,
      late: ticket.timeEntries.filter((e) => e.isLate).length,
    },
    subtasks: {
      done: ticket.subtasks.filter((s) => s.status === "COMPLETADA").length,
      total: ticket.subtasks.length,
    },
    comments: ticket._count.comments,
    people: [...work.byPerson]
      .map(([id, totals]) => {
        const p = people.get(id);
        return {
          id,
          name: p?.user.name ?? "—",
          image: p?.user.image ?? null,
          ...totals,
        };
      })
      .sort((a, b) => b.minutes - a.minutes),
    bySubtask: toRows(work.bySubtask, (id) =>
      id === null ? "En el ticket" : (subtaskTitles.get(id) ?? "Subtarea"),
    ),
    byBag: toRows(work.byBag, (id) => bagLabels.get(id) ?? "Bolsa"),
  };
}

const BAG_LABEL = {
  cvLine: {
    select: {
      description: true,
      version: { select: { number: true, cv: { select: { code: true } } } },
    },
  },
} as const;

function bagLabel(bag: {
  cvLine: {
    description: string;
    version: { number: number; cv: { code: string } };
  };
}): string {
  const { version, description } = bag.cvLine;
  return `${toCvVersionLabel(version.cv.code, version.number)} · ${description}`;
}

function toRows<K>(map: Map<K, number>, label: (key: K) => string): Row[] {
  return [...map]
    .map(([key, minutes]) => ({ id: String(key), label: label(key), minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}
