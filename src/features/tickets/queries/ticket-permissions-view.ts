// src/features/tickets/queries/ticket-permissions-view.ts
// Qué puede hacer el usuario con un ticket y qué transiciones de trabajo le muestra la interfaz; el servidor
// vuelve a validarlas (AGENTS.md §8, §2.9).
import { canTransitionTicket } from "@/domain/tickets/ticket-state-machine";
import type { TicketStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import {
  canCloseTicket,
  canCommentTicket,
  canLogTime,
  canManageTicket,
  type TicketAccess,
} from "@/server/authz/ticket-permissions";
import type { TicketPermissions, WorkStatus } from "../types";

const WORK_STATUSES: WorkStatus[] = [
  "EN_PROGRESO",
  "EN_ESPERA_CLIENTE",
  "RESUELTO",
  "CANCELADO",
];

export function toTicketPermissions(
  user: SessionUser,
  access: TicketAccess,
  status: TicketStatus,
): TicketPermissions {
  const canManage = canManageTicket(user, access);
  const canClose = canCloseTicket(user, access);
  // TRAMPA: desde CERRADO solo se sale con «Reabrir», que exige motivo (lo descontado queda firme).
  const transitions =
    status === "CERRADO"
      ? []
      : WORK_STATUSES.filter(
          (to) =>
            canTransitionTicket(status, to) &&
            (to === "CANCELADO" ? canClose : canManage),
        );
  return {
    viewerId: user.id,
    canManage,
    canClose,
    canComment: canCommentTicket(user, access),
    canLogTime: canLogTime(user, access),
    transitions,
  };
}
