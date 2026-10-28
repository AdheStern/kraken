// src/server/authz/scope-ticket-request-query.ts
// Filtro de visibilidad de las solicitudes de ticket (AGENTS.md §2.6, §2.9).
// REGLA: todo listado de solicitudes pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "./roles";
import { ticketAreasManagedBy } from "./ticket-permissions";

// REGLA: cada quien ve las suyas; quien atiende ve además las de las áreas que gestiona (GG, todas).
export function scopeTicketRequestQuery(
  user: SessionUser,
): Prisma.TicketRequestWhereInput {
  const managed = ticketAreasManagedBy(user);
  if (managed === null) return {};
  const visible: Prisma.TicketRequestWhereInput[] = [{ requesterId: user.id }];
  if (managed.length > 0) visible.push({ areaId: { in: managed } });
  return { OR: visible };
}
