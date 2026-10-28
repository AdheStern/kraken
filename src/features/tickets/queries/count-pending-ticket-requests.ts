// src/features/tickets/queries/count-pending-ticket-requests.ts
// Cuántas solicitudes de ticket pendientes puede atender el usuario, para el contador del riel y de Tickets
// (AGENTS.md §2.6 «Solicitudes de ticket»).
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketRequestQuery } from "@/server/authz/scope-ticket-request-query";
import {
  canHandleAnyTicketRequest,
  canHandleTicketRequest,
} from "@/server/authz/ticket-request-permissions";
import { prisma } from "@/server/db";

export async function countPendingTicketRequests(
  user: SessionUser,
): Promise<number> {
  if (!canHandleAnyTicketRequest(user)) return 0;
  const rows = await prisma.ticketRequest.findMany({
    where: { AND: [scopeTicketRequestQuery(user), { status: "PENDIENTE" }] },
    select: { areaId: true },
  });
  return rows.filter((r) => canHandleTicketRequest(user, r)).length;
}
