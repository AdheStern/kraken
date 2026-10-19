// src/server/tickets/create-subtask-record.ts
// Alta de una subtarea por quien gestiona el ticket, con aviso al asignado
// (AGENTS.md §2.6 "El encargado crea subtareas y las asigna").
import { type ActionResult, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notifyOwnerAssigned } from "./notify-owner-assigned";
import { checkSubtaskManageable } from "./subtask-guards";

export async function createSubtaskRecord(
  tx: Tx,
  user: SessionUser,
  input: { ticketId: string; title: string; assigneeId: string | null },
): Promise<ActionResult<{ subtaskId: string }>> {
  const issue = await checkSubtaskManageable(
    tx,
    user,
    input.ticketId,
    input.assigneeId,
  );
  if (issue) return issue;
  const subtask = await tx.subtask.create({
    data: { ...input, createdById: user.id },
    select: { id: true, ticket: { select: { id: true, number: true } } },
  });
  if (input.assigneeId)
    await notifyOwnerAssigned(
      tx,
      subtask.ticket,
      input.title,
      input.assigneeId,
      user,
    );
  return actionOk({ subtaskId: subtask.id });
}
