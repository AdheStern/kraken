// src/features/tickets/queries/list-open-timers.ts
// Contadores que no terminaron (corriendo o pausados) de una persona o de un ticket, con su tiempo acumulado
// y quién los lleva; para el contador del detalle, las subtareas, la cabecera e Inicio (AGENTS.md §2.6, §5).
import { computeTimerState } from "@/domain/tickets/timer-state";
import { Prisma } from "@/generated/prisma/client";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import type { TimerView } from "../types";

// POR QUÉ: quien ve el ticket ya ve todos sus registros; ver los contadores en curso de otros no expone más.
type Filter = { userId: string } | { ticketId: string };

export async function listOpenTimers(filter: Filter): Promise<TimerView[]> {
  const where =
    "userId" in filter
      ? Prisma.sql`usuario_id = ${filter.userId}`
      : Prisma.sql`ticket_id = ${filter.ticketId}::uuid`;
  // POR QUÉ: el último evento de cada contador dice si terminó; la misma consulta que exige el cierre.
  const open = await prisma.$queryRaw<{ contador_id: string }[]>`
    SELECT ultimo.contador_id::text AS contador_id
    FROM (
      SELECT DISTINCT ON (contador_id) contador_id, tipo
      FROM tickets.evento_contador
      WHERE ${where}
      ORDER BY contador_id, ocurrido_en DESC, id DESC
    ) AS ultimo
    WHERE ultimo.tipo <> 'TERMINAR'`;
  if (open.length === 0) return [];
  const events = await prisma.timerEvent.findMany({
    where: { timerId: { in: open.map((o) => o.contador_id) } },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    select: {
      timerId: true,
      kind: true,
      occurredAt: true,
      subtaskId: true,
      ticket: { select: { id: true, number: true, title: true } },
      subtask: { select: { title: true } },
      user: {
        select: {
          userId: true,
          user: { select: { name: true, image: true } },
        },
      },
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
      person: {
        id: first.user.userId,
        name: first.user.user.name,
        image: first.user.user.image,
      },
      ticketId: first.ticket.id,
      ticketNumber: first.ticket.number,
      ticketTitle: first.ticket.title,
      subtaskId: first.subtaskId,
      subtaskTitle: first.subtask?.title ?? null,
    };
  });
}
