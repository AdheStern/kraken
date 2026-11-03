// src/features/tickets/queries/list-customer-tickets.ts
// Tickets de la empresa de una cuenta del portal, los abiertos primero, con sus horas descontadas (§2.11).
import { summarizeTicketWork } from "@/domain/tickets/summarize-ticket-work";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCustomerTicketQuery } from "@/server/authz/scope-customer-ticket-query";
import { prisma } from "@/server/db";
import type { CustomerTicketRow } from "../customer-portal-types";

const LIMIT = 300;

export const CUSTOMER_TICKET_SELECT = {
  id: true,
  number: true,
  title: true,
  status: true,
  priority: true,
  createdAt: true,
  closedAt: true,
  owner: { select: { user: { select: { name: true } } } },
  hourMovements: {
    where: { kind: { in: ["CONSUMO", "REVERSO"] } },
    select: { bagId: true, minutes: true },
  },
} satisfies Prisma.TicketSelect;

export async function listCustomerTickets(
  user: SessionUser,
): Promise<CustomerTicketRow[]> {
  const tickets = await prisma.ticket.findMany({
    where: scopeCustomerTicketQuery(user),
    orderBy: [
      { closedAt: { sort: "desc", nulls: "first" } },
      { number: "desc" },
    ],
    take: LIMIT,
    select: CUSTOMER_TICKET_SELECT,
  });
  return tickets.map(toCustomerTicketRow);
}

type TicketRecord = {
  id: string;
  number: number;
  title: string;
  status: CustomerTicketRow["status"];
  priority: CustomerTicketRow["priority"];
  createdAt: Date;
  closedAt: Date | null;
  owner: { user: { name: string } } | null;
  hourMovements: { bagId: string; minutes: number }[];
};

// REGLA: las horas descontadas tienen una sola definición (summarizeTicketWork, §6).
export function toCustomerTicketRow(t: TicketRecord): CustomerTicketRow {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    status: t.status,
    priority: t.priority,
    ownerName: t.owner?.user.name ?? null,
    createdAt: t.createdAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
    chargedMinutes: summarizeTicketWork([], t.hourMovements).chargedMinutes,
  };
}
