// src/server/authz/ticket-permissions.ts
// Permisos sobre tickets (AGENTS.md §2.9): entrar al módulo, crear, gestionar, cerrar y reabrir, y
// registrar tiempo.
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

export type TicketAccess = {
  areaIds: readonly string[];
  ownerId: string | null;
  subtaskAssigneeIds: readonly string[];
};

const TICKET_VIEWERS = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "COORDINADOR_SOPORTE",
  "COMERCIAL",
  "INGENIERO",
] as const;

export function canSeeTickets(user: SessionUser): boolean {
  return TICKET_VIEWERS.some((code) => hasRole(user, code));
}

// POR QUÉ: áreas donde el usuario crea, asigna, cierra y reabre; null = todas (GG).
export function ticketAreasManagedBy(user: SessionUser): string[] | null {
  if (hasRole(user, "GERENTE_GENERAL")) return null;
  return [
    ...new Set([
      ...areaIdsWithRole(user, "COORDINADOR_SOPORTE"),
      ...areaIdsWithRole(user, "GERENTE_AREA"),
    ]),
  ];
}

// REGLA: crean, asignan encargado, cierran y reabren el coordinador o el gerente de un área del ticket y el
// GG; el encargado lo deja en RESUELTO pero no cierra (§1 roles, decisión del 2026-10-19).
export function canCloseTicket(
  user: SessionUser,
  ticket: { areaIds: readonly string[] },
): boolean {
  const managed = ticketAreasManagedBy(user);
  return managed === null || ticket.areaIds.some((a) => managed.includes(a));
}

export const canCreateTicket = canCloseTicket;

export function canCreateAnyTicket(user: SessionUser): boolean {
  const managed = ticketAreasManagedBy(user);
  return managed === null || managed.length > 0;
}

// REGLA: el encargado también ordena las bolsas, crea subtareas y mueve el estado hasta RESUELTO (§2.6).
export function canManageTicket(
  user: SessionUser,
  ticket: TicketAccess,
): boolean {
  return ticket.ownerId === user.id || canCloseTicket(user, ticket);
}

// REGLA: registran tiempo el ingeniero en sus subtareas y tickets a cargo y el gerente de su área; ni el
// comercial, ni el GG, ni Administración (§2.9, fila "Tickets: registrar tiempo").
export function canLogTime(user: SessionUser, ticket: TicketAccess): boolean {
  if (ticket.ownerId === user.id || ticket.subtaskAssigneeIds.includes(user.id))
    return true;
  const managed = areaIdsWithRole(user, "GERENTE_AREA");
  return ticket.areaIds.some((areaId) => managed.includes(areaId));
}

// POR QUÉ: comenta quien trabaja el ticket o lo gestiona; el comercial lo consulta sin intervenir.
export function canCommentTicket(
  user: SessionUser,
  ticket: TicketAccess,
): boolean {
  return canManageTicket(user, ticket) || canLogTime(user, ticket);
}
