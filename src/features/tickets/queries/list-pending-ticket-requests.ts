// src/features/tickets/queries/list-pending-ticket-requests.ts
// Solicitudes pendientes que el usuario puede atender, las más antiguas primero, con lo que prellena el alta del
// ticket (AGENTS.md §2.6 «Solicitudes de ticket»).
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketRequestQuery } from "@/server/authz/scope-ticket-request-query";
import { canHandleTicketRequest } from "@/server/authz/ticket-request-permissions";
import { prisma } from "@/server/db";

export type PendingTicketRequestView = {
  id: string;
  number: number;
  title: string;
  description: string;
  areaId: string;
  areaCode: string;
  requesterName: string;
  // POR QUÉ: prellena la ciudad del ticket; el coordinador la puede cambiar.
  requesterCityId: string | null;
  createdAt: string;
};

export async function listPendingTicketRequests(
  user: SessionUser,
): Promise<PendingTicketRequestView[]> {
  const rows = await prisma.ticketRequest.findMany({
    where: { AND: [scopeTicketRequestQuery(user), { status: "PENDIENTE" }] },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      areaId: true,
      createdAt: true,
      area: { select: { code: true } },
      requester: {
        select: { cityId: true, user: { select: { name: true } } },
      },
    },
  });
  return rows
    .filter((r) => canHandleTicketRequest(user, r))
    .map(({ area, requester, createdAt, ...r }) => ({
      ...r,
      areaCode: area.code,
      requesterName: requester.user.name,
      requesterCityId: requester.cityId,
      createdAt: createdAt.toISOString(),
    }));
}
