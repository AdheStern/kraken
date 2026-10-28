// src/server/authz/ticket-request-permissions.ts
// Permisos sobre las solicitudes de ticket (AGENTS.md §2.6 «Solicitudes de ticket», §2.9).
import type { SessionUser } from "./roles";
import { canCreateAnyTicket, canCreateTicket } from "./ticket-permissions";

// REGLA: pide un ticket todo usuario con al menos un rol (§2.9, fila "Solicitudes: crear").
export function canRequestTicket(user: SessionUser): boolean {
  return user.roles.length > 0;
}

// REGLA: atiende (crea el ticket o descarta) quien puede crear tickets del área de la solicitud (§2.9).
export function canHandleTicketRequest(
  user: SessionUser,
  request: { areaId: string },
): boolean {
  return canCreateTicket(user, { areaIds: [request.areaId] });
}

export const canHandleAnyTicketRequest = canCreateAnyTicket;
