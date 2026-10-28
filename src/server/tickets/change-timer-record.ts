// src/server/tickets/change-timer-record.ts
// Pausa, reanuda o termina un contador propio: registra el evento con la hora del servidor y cierra o abre su
// tramo; reanudar pausa el que estuviera corriendo, y en una subtarea reanudar o terminar mueve su estado (AGENTS.md §2.6, §8 contador CORRIENDO ⇄ PAUSADO → TERMINADO).
import {
  computeTimerState,
  nextTimerStatus,
  type TimerStatus,
} from "@/domain/tickets/timer-state";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { lockTicket } from "./lock-ticket";
import { closeSpan, pauseRunningTimer } from "./pause-running-timer";
import { lockUserTimers } from "./prepare-time-logging";
import { markSubtaskFinished, markSubtaskStarted } from "./sync-subtask-status";

type Change = { timerId: string; kind: "PAUSAR" | "REANUDAR" | "TERMINAR" };

export async function changeTimerRecord(
  tx: Tx,
  user: SessionUser,
  { timerId, kind }: Change,
): Promise<ActionResult<{ status: TimerStatus }>> {
  await lockUserTimers(tx, user.id);
  const events = await tx.timerEvent.findMany({
    where: { timerId },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    select: {
      kind: true,
      occurredAt: true,
      userId: true,
      ticketId: true,
      subtaskId: true,
    },
  });
  const [first] = events;
  if (!first || first.userId !== user.id)
    return actionError("NOT_FOUND", "Ese contador no existe o no es tuyo.");
  const current = computeTimerState(events, new Date()).status;
  const status = nextTimerStatus(current, kind);
  if (!status)
    return actionError(
      "INVALID_STATE",
      "El contador cambió en otra pestaña. Recarga la página.",
    );
  if (kind === "REANUDAR") {
    const issue = await checkCanResume(tx, first.ticketId);
    if (issue) return issue;
    await pauseRunningTimer(tx, user.id);
  }

  const event = await tx.timerEvent.create({
    data: {
      timerId,
      ticketId: first.ticketId,
      subtaskId: first.subtaskId,
      userId: user.id,
      kind,
    },
    select: { occurredAt: true },
  });
  if (current === "CORRIENDO") await closeSpan(tx, timerId, event.occurredAt);
  if (first.subtaskId && kind === "REANUDAR")
    await markSubtaskStarted(tx, first.subtaskId);
  if (first.subtaskId && kind === "TERMINAR")
    await markSubtaskFinished(tx, first.subtaskId, event.occurredAt);
  if (kind === "REANUDAR")
    await tx.timeEntry.create({
      data: {
        ticketId: first.ticketId,
        subtaskId: first.subtaskId,
        userId: user.id,
        startedAt: event.occurredAt,
        source: "CONTADOR",
        timerId,
      },
    });
  return actionOk({ status });
}

async function checkCanResume(
  tx: Tx,
  ticketId: string,
): Promise<ActionResult<never> | null> {
  const ticket = await lockTicket(tx, ticketId);
  return !ticket || ["RESUELTO", "CERRADO", "CANCELADO"].includes(ticket.status)
    ? actionError(
        "INVALID_STATE",
        "El ticket ya no admite trabajo. Termina el contador o pide que lo reabran.",
      )
    : null;
}
