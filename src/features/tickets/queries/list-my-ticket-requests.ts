// src/features/tickets/queries/list-my-ticket-requests.ts
// Solicitudes que pidió el usuario, con el estado, el número y el encargado del ticket que nació de cada una
// (AGENTS.md §2.6 «Solicitudes de ticket»). Sin horas ni bolsas: el solicitante solo sigue el estado.
import type {
  TicketRequestStatus,
  TicketStatus,
} from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketRequestQuery } from "@/server/authz/scope-ticket-request-query";
import { prisma } from "@/server/db";

export type MyTicketRequestView = {
  id: string;
  number: number;
  title: string;
  areaCode: string;
  status: TicketRequestStatus;
  discardReason: string | null;
  createdAt: string;
  handledAt: string | null;
  ticket: {
    number: number;
    status: TicketStatus;
    ownerName: string | null;
    updatedAt: string;
  } | null;
};

export async function listMyTicketRequests(
  user: SessionUser,
): Promise<MyTicketRequestView[]> {
  const rows = await prisma.ticketRequest.findMany({
    where: { AND: [scopeTicketRequestQuery(user), { requesterId: user.id }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      discardReason: true,
      createdAt: true,
      handledAt: true,
      area: { select: { code: true } },
      ticket: {
        select: {
          number: true,
          status: true,
          updatedAt: true,
          owner: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
  return rows.map(({ area, ticket, createdAt, handledAt, ...r }) => ({
    ...r,
    areaCode: area.code,
    createdAt: createdAt.toISOString(),
    handledAt: handledAt?.toISOString() ?? null,
    ticket: ticket && {
      number: ticket.number,
      status: ticket.status,
      ownerName: ticket.owner?.user.name ?? null,
      updatedAt: ticket.updatedAt.toISOString(),
    },
  }));
}
