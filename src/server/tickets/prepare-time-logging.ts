// src/server/tickets/prepare-time-logging.ts
// Verificaciones comunes antes de registrar tiempo: el ticket existe y admite trabajo, la subtarea es suya y el
// usuario puede registrar ahí (AGENTS.md §2.6, §2.9 "Tickets: registrar tiempo").
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canLogTimeOn } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { loadTicketAccess } from "./load-ticket-access";
import { type LockedTicket, lockTicket } from "./lock-ticket";

// POR QUÉ: el contador corre solo mientras se trabaja; un registro manual también entra con el ticket resuelto,
// antes del cierre.
const OPEN_FOR_TIMER: TicketStatus[] = [
  "ASIGNADO",
  "EN_PROGRESO",
  "EN_ESPERA_CLIENTE",
];
const OPEN_FOR_MANUAL: TicketStatus[] = [...OPEN_FOR_TIMER, "RESUELTO"];

type Target = { ticketId: string; subtaskId: string | null };

export async function prepareTimeLogging(
  tx: Tx,
  user: SessionUser,
  { ticketId, subtaskId }: Target,
  mode: "TIMER" | "MANUAL",
): Promise<ActionResult<LockedTicket>> {
  const ticket = await lockTicket(tx, ticketId);
  const access = await loadTicketAccess(tx, ticketId);
  if (!ticket || !access)
    return actionError("NOT_FOUND", "El ticket ya no existe.");
  let assigneeId: string | null | undefined;
  if (subtaskId) {
    const subtask = await tx.subtask.findFirst({
      where: { id: subtaskId, ticketId },
      select: { assigneeId: true },
    });
    if (!subtask)
      return actionError("NOT_FOUND", "La subtarea no es de este ticket.");
    assigneeId = subtask.assigneeId;
  }
  if (!canLogTimeOn(user, access, assigneeId))
    return actionError(
      "FORBIDDEN",
      "Registras tiempo en tus subtareas y en los tickets a tu cargo.",
    );
  const allowed = mode === "TIMER" ? OPEN_FOR_TIMER : OPEN_FOR_MANUAL;
  if (!allowed.includes(ticket.status))
    return actionError(
      "INVALID_STATE",
      ticket.status === "NUEVO"
        ? "El ticket aún no tiene encargado. Pide que lo asignen antes de registrar tiempo."
        : "El ticket ya no admite registros de tiempo. Reábrelo si falta cargar trabajo.",
    );
  return actionOk(ticket);
}

// TRAMPA: serializa las acciones de contador de una misma persona; sin esto, dos clics simultáneos podrían
// abrir dos tramos antes de que el índice único lo impida con un error genérico.
export async function lockUserTimers(tx: Tx, userId: string): Promise<void> {
  await tx.$queryRaw`
    SELECT usuario_id FROM core.usuario_perfil WHERE usuario_id = ${userId} FOR UPDATE`;
}

export async function findRunningEntry(tx: Tx, userId: string) {
  return tx.timeEntry.findFirst({
    where: { userId, endedAt: null },
    select: {
      id: true,
      timerId: true,
      ticketId: true,
      subtaskId: true,
      startedAt: true,
      ticket: { select: { number: true } },
    },
  });
}
