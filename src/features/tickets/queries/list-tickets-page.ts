// src/features/tickets/queries/list-tickets-page.ts
// Página de la vista de lista de tickets: todos los visibles (también los cerrados hace tiempo), con los filtros,
// el orden y la página de la URL resueltos en la base (AGENTS.md §5, regla 7).

import { toPageWindow } from "@/domain/sales-control/cv-list-order";
import { getSlaAlertPct } from "@/features/sla/queries/to-sla-badges";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import type {
  TicketListParams,
  TicketSort,
} from "../schemas/ticket-list-params";
import type { TicketCard } from "../types";
import { TICKET_CARD_SELECT, toTicketCard } from "./list-tickets";

export type TicketListPage = {
  rows: TicketCard[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  firstIndex: number;
  lastIndex: number;
};

export async function listTicketsPage(
  user: SessionUser,
  params: TicketListParams,
  projectId?: string,
): Promise<TicketListPage> {
  const where: Prisma.TicketWhereInput = {
    AND: [scopeTicketQuery(user), toWhere(user, params, projectId)],
  };
  const total = await prisma.ticket.count({ where });
  const window = toPageWindow(total, params.page, params.pageSize);
  const [records, alertPct] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: TICKET_CARD_SELECT,
      orderBy: [toOrderBy(params.sort), { number: "desc" }],
      skip: window.start,
      take: params.pageSize,
    }),
    getSlaAlertPct(),
  ]);
  return {
    rows: records.map((r) => toTicketCard(user, r, alertPct)),
    total,
    page: window.page,
    pageCount: window.pageCount,
    pageSize: params.pageSize,
    firstIndex: total === 0 ? 0 : window.start + 1,
    lastIndex: window.end,
  };
}

function toWhere(
  user: SessionUser,
  p: TicketListParams,
  projectId: string | undefined,
): Prisma.TicketWhereInput {
  const number = p.search && /^\d+$/.test(p.search) ? Number(p.search) : null;
  return {
    projectId,
    customerId: p.customerId,
    status: p.status,
    ...(p.areaCode && { areas: { some: { area: { code: p.areaCode } } } }),
    AND: [
      p.mine
        ? {
            OR: [
              { ownerId: user.id },
              { subtasks: { some: { assigneeId: user.id } } },
            ],
          }
        : {},
      p.search
        ? {
            OR: [
              { title: { contains: p.search, mode: "insensitive" } },
              ...(number !== null ? [{ number }] : []),
            ],
          }
        : {},
    ],
  };
}

function toOrderBy({
  key,
  direction,
}: TicketSort): Prisma.TicketOrderByWithRelationInput {
  switch (key) {
    case "numero":
      return { number: direction };
    case "titulo":
      return { title: direction };
    case "cliente":
      return { customer: { name: direction } };
    case "prioridad":
      return { priority: direction };
    case "estado":
      return { status: direction };
    case "actualizado":
      return { updatedAt: direction };
  }
}
