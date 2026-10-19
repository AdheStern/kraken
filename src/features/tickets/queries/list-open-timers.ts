// src/features/tickets/queries/list-open-timers.ts
// Contadores del usuario que no terminaron (corriendo o pausados), con su tiempo acumulado; para el contador
// del detalle y para Inicio (AGENTS.md §2.6, §5 "ingeniero → sus tickets con el contador").
import { computeTimerState } from "@/domain/tickets/timer-state";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import type { TimerView } from "../types";

export async function listOpenTimers(
  userId: string,
  ticketId?: string,
): Promise<TimerView[]> {
  // POR QUÉ: el último evento de cada contador dice si terminó; la misma consulta que exige el cierre.
  const open = await prisma.$queryRaw<{ contador_id: string }[]>`
    SELECT ultimo.contador_id::text AS contador_id
    FROM (
      SELECT DISTINCT ON (contador_id) contador_id, tipo
      FROM tickets.evento_contador
      WHERE usuario_id = ${userId}
      ORDER BY contador_id, ocurrido_en DESC, id DESC
    ) AS ultimo
    WHERE ultimo.tipo <> 'TERMINAR'`;
  if (open.length === 0) return [];
  const events = await prisma.timerEvent.findMany({
    where: {
      timerId: { in: open.map((o) => o.contador_id) },
      ...(ticketId && { ticketId }),
    },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    select: {
      timerId: true,
      kind: true,
      occurredAt: true,
      ticket: { select: { id: true, number: true, title: true } },
      subtask: { select: { title: true } },
    },
  });
  const byTimer = new Map<string, typeof events>();
  for (const event of events)
    byTimer.set(event.timerId, [...(byTimer.get(event.timerId) ?? []), event]);
  const now = systemClock.now();
  return [...byTimer.entries()].map(([timerId, timerEvents]) => {
    const state = computeTimerState(timerEvents, now);
    const [first] = timerEvents;
    const running = state.runningSince
      ? now.getTime() - state.runningSince.getTime()
      : 0;
    return {
      timerId,
      status: state.status === "CORRIENDO" ? "CORRIENDO" : "PAUSADO",
      closedMs: state.elapsedMs - running,
      runningSince: state.runningSince?.toISOString() ?? null,
      ticketId: first.ticket.id,
      ticketNumber: first.ticket.number,
      ticketTitle: first.ticket.title,
      subtaskTitle: first.subtask?.title ?? null,
    };
  });
}
