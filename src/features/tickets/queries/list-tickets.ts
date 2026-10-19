// src/features/tickets/queries/list-tickets.ts
// Tickets visibles para el usuario, para el kanban y la lista (AGENTS.md §2.9 "Tickets: ver", §5 navegación).
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import type { TicketCard, TicketFilters } from "../types";

// LIMITACIÓN: sin paginación; son ~40 usuarios y cientos de tickets abiertos (AGENTS.md §3).
const MAX_TICKETS = 400;
// POR QUÉ: el tablero muestra los terminados de las últimas dos semanas; los anteriores, filtrando por estado.
const RECENT_FINISHED_DAYS = 14;

export const TICKET_CARD_SELECT = {
  id: true,
  number: true,
  title: true,
  kind: true,
  status: true,
  priority: true,
  updatedAt: true,
  customer: { select: { name: true } },
  areas: { select: { area: { select: { code: true } } } },
  owner: {
    select: { userId: true, user: { select: { name: true, image: true } } },
  },
} satisfies Prisma.TicketSelect;

type CardRecord = Prisma.TicketGetPayload<{
  select: typeof TICKET_CARD_SELECT;
}>;

export async function listTickets(
  user: SessionUser,
  filters: TicketFilters = {},
): Promise<TicketCard[]> {
  const records = await prisma.ticket.findMany({
    where: {
      AND: [
        scopeTicketQuery(user),
        filters.status ? { status: filters.status } : recentOrOpen(),
        filters.areaId ? { areas: { some: { areaId: filters.areaId } } } : {},
        filters.customerId ? { customerId: filters.customerId } : {},
        filters.mine
          ? {
              OR: [
                { ownerId: user.id },
                { subtasks: { some: { assigneeId: user.id } } },
              ],
            }
          : {},
      ],
    },
    select: TICKET_CARD_SELECT,
    orderBy: { updatedAt: "desc" },
    take: MAX_TICKETS,
  });
  return records.map(toTicketCard);
}

export function toTicketCard(r: CardRecord): TicketCard {
  return {
    id: r.id,
    number: r.number,
    title: r.title,
    kind: r.kind,
    status: r.status,
    priority: r.priority,
    customerName: r.customer.name,
    areaCodes: r.areas.map((a) => a.area.code),
    owner: r.owner
      ? {
          id: r.owner.userId,
          name: r.owner.user.name,
          image: r.owner.user.image,
        }
      : null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function recentOrOpen(): Prisma.TicketWhereInput {
  const since = new Date(
    systemClock.now().getTime() - RECENT_FINISHED_DAYS * 86_400_000,
  );
  return {
    OR: [
      { status: { notIn: ["CERRADO", "CANCELADO"] } },
      { updatedAt: { gte: since } },
    ],
  };
}
