// src/features/tickets/queries/get-customer-ticket.ts
// Un ticket de la empresa de una cuenta del portal: datos, SLA, comentarios públicos y horas descontadas
// (AGENTS.md §2.11). Fuera de su empresa devuelve null.
import type { SessionUser } from "@/server/authz/roles";
import { scopeCustomerTicketQuery } from "@/server/authz/scope-customer-ticket-query";
import { prisma } from "@/server/db";
import { selectFileStore } from "@/server/files/select-file-store";
import type { CustomerTicketDetail } from "../customer-portal-types";
import {
  CUSTOMER_TICKET_SELECT,
  toCustomerTicketRow,
} from "./list-customer-tickets";

export async function getCustomerTicket(
  user: SessionUser,
  ticketId: string,
): Promise<CustomerTicketDetail | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [scopeCustomerTicketQuery(user), { id: ticketId }] },
    select: {
      ...CUSTOMER_TICKET_SELECT,
      description: true,
      resolvedAt: true,
      slaMeasurements: { select: { kind: true, status: true } },
      // REGLA: el cliente nunca ve los comentarios internos (§2.11).
      comments: {
        where: { isPublic: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { user: { select: { name: true } } } },
        },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fileName: true, sizeBytes: true, createdAt: true },
      },
      statusEvents: {
        where: { toStatus: "RESUELTO" },
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { conformity: { select: { isSatisfied: true, rating: true } } },
      },
    },
  });
  if (!ticket) return null;
  return {
    ...toCustomerTicketRow(ticket),
    description: ticket.description,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    sla: ticket.slaMeasurements,
    comments: ticket.comments.map((c) => ({
      id: c.id,
      authorName: c.author.user.name,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
    attachments: ticket.attachments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    // REGLA: el ticket ya pasó por el alcance de su empresa; falta su configuración (§2.11).
    canComment:
      user.customer?.comments === true &&
      !["CERRADO", "CANCELADO"].includes(ticket.status),
    filesEnabled: selectFileStore() !== null,
    conformity: {
      canAnswer:
        ticket.status === "RESUELTO" &&
        ticket.statusEvents.length > 0 &&
        !ticket.statusEvents[0].conformity,
      answer: ticket.statusEvents[0]?.conformity ?? null,
    },
  };
}
