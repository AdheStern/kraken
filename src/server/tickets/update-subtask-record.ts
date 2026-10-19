// src/server/tickets/update-subtask-record.ts
// Reasigna una subtarea o cambia su estado; su asignado también cambia el estado de la suya (AGENTS.md §2.6).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notifyOwnerAssigned } from "./notify-owner-assigned";
import { checkSubtaskManageable, checkTicketOpen } from "./subtask-guards";

type SubtaskStatus = "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA" | "CANCELADA";

export async function updateSubtaskRecord(
  tx: Tx,
  user: SessionUser,
  input: {
    subtaskId: string;
    assigneeId?: string | null;
    status?: SubtaskStatus;
  },
  now: Date,
): Promise<ActionResult<{ subtaskId: string }>> {
  const subtask = await tx.subtask.findUnique({
    where: { id: input.subtaskId },
    select: { ticketId: true, assigneeId: true, title: true },
  });
  if (!subtask) return actionError("NOT_FOUND", "La subtarea ya no existe.");
  // POR QUÉ: el asignado solo cambia el estado de la suya; reasignar es de quien gestiona el ticket.
  const ownStatusOnly =
    subtask.assigneeId === user.id && input.assigneeId === undefined;
  const issue = ownStatusOnly
    ? await checkTicketOpen(tx, subtask.ticketId)
    : await checkSubtaskManageable(
        tx,
        user,
        subtask.ticketId,
        input.assigneeId ?? null,
      );
  if (issue) return issue;
  const updated = await tx.subtask.update({
    where: { id: input.subtaskId },
    data: {
      ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      ...(input.status && {
        status: input.status,
        completedAt: input.status === "COMPLETADA" ? now : null,
      }),
    },
    select: { ticket: { select: { id: true, number: true } } },
  });
  if (input.assigneeId && input.assigneeId !== subtask.assigneeId)
    await notifyOwnerAssigned(
      tx,
      updated.ticket,
      subtask.title,
      input.assigneeId,
      user,
    );
  return actionOk({ subtaskId: input.subtaskId });
}
