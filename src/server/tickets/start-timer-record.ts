// src/server/tickets/start-timer-record.ts
// Inicia un contador en un ticket o subtarea: evento con la hora del servidor y su tramo abierto; un ticket
// ASIGNADO pasa a EN_PROGRESO (AGENTS.md §2.6 registro de tiempo, §8 contador).
import { randomUUID } from "node:crypto";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import {
  findRunningEntry,
  lockUserTimers,
  prepareTimeLogging,
} from "./prepare-time-logging";

type Target = { ticketId: string; subtaskId: string | null };

export async function startTimerRecord(
  tx: Tx,
  user: SessionUser,
  target: Target,
): Promise<ActionResult<{ timerId: string }>> {
  const prepared = await prepareTimeLogging(tx, user, target, "TIMER");
  if (!prepared.ok) return prepared;
  const ticket = prepared.data;
  await lockUserTimers(tx, user.id);
  const running = await findRunningEntry(tx, user.id);
  // REGLA: un solo contador corriendo por persona (§2.6); el índice parcial de la base es la última red.
  if (running)
    return actionError(
      "CONFLICT",
      `Ya tienes un contador corriendo en el ticket #${running.ticket.number}. Páusalo antes de iniciar otro.`,
    );

  const timerId = randomUUID();
  // POR QUÉ: la hora la pone la base (now()); el navegador no puede adelantarla ni atrasarla.
  const event = await tx.timerEvent.create({
    data: { timerId, ...target, userId: user.id, kind: "INICIAR" },
    select: { occurredAt: true },
  });
  await tx.timeEntry.create({
    data: {
      ...target,
      userId: user.id,
      startedAt: event.occurredAt,
      source: "CONTADOR",
      timerId,
    },
  });
  if (ticket.status === "ASIGNADO")
    await applyStatusChange(tx, {
      ticketId: ticket.id,
      from: "ASIGNADO",
      to: "EN_PROGRESO",
      actorId: user.id,
      now: event.occurredAt,
    });
  return actionOk({ timerId });
}
