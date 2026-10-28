// src/server/tickets/pause-running-timer.ts
// Pausa el contador que la persona tenga corriendo (en cualquier ticket) antes de iniciar o reanudar otro, y
// cierra el tramo abierto de un contador (AGENTS.md §2.6 "un solo contador activo por persona").
import type { Tx } from "@/server/db";
import { findRunningEntry } from "./prepare-time-logging";

// REGLA: un solo contador corriendo por persona (§2.6): al iniciar otro, el anterior se pausa solo con la hora
// del servidor. Exige lockUserTimers antes, en la misma transacción.
export async function pauseRunningTimer(tx: Tx, userId: string) {
  const running = await findRunningEntry(tx, userId);
  if (!running?.timerId) return;
  const event = await tx.timerEvent.create({
    data: {
      timerId: running.timerId,
      ticketId: running.ticketId,
      subtaskId: running.subtaskId,
      userId,
      kind: "PAUSAR",
    },
    select: { occurredAt: true },
  });
  await closeSpan(tx, running.timerId, event.occurredAt);
}

// TRAMPA: un tramo de duración 0 viola el CHECK fin > inicio; se borra en lugar de cerrarlo.
export async function closeSpan(tx: Tx, timerId: string, endedAt: Date) {
  const open = await tx.timeEntry.findFirst({
    where: { timerId, endedAt: null },
    select: { id: true, startedAt: true },
  });
  if (!open) return;
  if (endedAt.getTime() > open.startedAt.getTime())
    await tx.timeEntry.update({ where: { id: open.id }, data: { endedAt } });
  else await tx.timeEntry.delete({ where: { id: open.id } });
}
