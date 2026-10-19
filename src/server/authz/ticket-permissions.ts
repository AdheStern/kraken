// src/server/authz/ticket-permissions.ts
// Permisos sobre tickets (AGENTS.md §2.9): cerrar con descuento de horas y reabrir.
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

// REGLA: cierran y reabren el coordinador de soporte o el gerente de un área del ticket, y el GG; el
// encargado lo deja en RESUELTO pero no cierra (§1 roles, decisión del 2026-10-19).
export function canCloseTicket(
  user: SessionUser,
  ticket: { areaIds: readonly string[] },
): boolean {
  if (hasRole(user, "GERENTE_GENERAL")) return true;
  const allowed = [
    ...areaIdsWithRole(user, "COORDINADOR_SOPORTE"),
    ...areaIdsWithRole(user, "GERENTE_AREA"),
  ];
  return ticket.areaIds.some((areaId) => allowed.includes(areaId));
}
