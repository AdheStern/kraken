// src/server/authz/ticket-request-permissions.ts
// Permisos sobre las solicitudes de ticket (AGENTS.md §2.6 «Solicitudes de ticket», §2.9).
import { isCustomerAccount, type SessionUser } from "./roles";
import { canCreateAnyTicket, canCreateTicket } from "./ticket-permissions";

// REGLA: pide un ticket todo usuario de DIMA, también sin rol: es lo primero que necesita quien recién entra
// (§2.9, fila "Solicitudes: crear"; decisión 2026-11-03). El cliente pide por el portal, si su empresa lo permite (§2.11).
export function canRequestTicket(user: SessionUser): boolean {
  return !isCustomerAccount(user);
}

// REGLA: la cuenta de un cliente pide trabajo solo si su empresa lo tiene habilitado (§2.11, `portal_pide_trabajo`).
export function canCustomerRequestWork(user: SessionUser): boolean {
  return user.customer?.requestsWork === true;
}

// REGLA: atiende (crea el ticket o descarta) quien puede crear tickets del área de la solicitud (§2.9).
export function canHandleTicketRequest(
  user: SessionUser,
  request: { areaId: string },
): boolean {
  return canCreateTicket(user, { areaIds: [request.areaId] });
}

export const canHandleAnyTicketRequest = canCreateAnyTicket;

// REGLA: solo quien la pidió retira su solicitud, mientras siga pendiente (§2.6, decisión 2026-10-29).
export function canWithdrawTicketRequest(
  user: SessionUser,
  request: { requesterId: string },
): boolean {
  return request.requesterId === user.id;
}
