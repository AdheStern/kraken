// src/server/tickets/sync-subtask-status.ts
// El contador de una subtarea mueve su estado: iniciar o reanudar la pasa a EN_PROGRESO y terminar, a COMPLETADA
// si nadie más tiene un contador corriendo en ella (AGENTS.md §2.6). Una subtarea CANCELADA no cambia.
import type { Tx } from "@/server/db";

export async function markSubtaskStarted(tx: Tx, subtaskId: string) {
  await tx.subtask.updateMany({
    where: { id: subtaskId, status: { in: ["PENDIENTE", "COMPLETADA"] } },
    data: { status: "EN_PROGRESO", completedAt: null },
  });
}

export async function markSubtaskFinished(tx: Tx, subtaskId: string, at: Date) {
  const stillRunning = await tx.timeEntry.count({
    where: { subtaskId, endedAt: null },
  });
  if (stillRunning > 0) return;
  await tx.subtask.updateMany({
    where: { id: subtaskId, status: { in: ["PENDIENTE", "EN_PROGRESO"] } },
    data: { status: "COMPLETADA", completedAt: at },
  });
}
