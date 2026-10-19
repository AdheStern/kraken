// src/server/tickets/warn-stale-timers.ts
// Job timers.stale: avisa una sola vez al ingeniero y al encargado cuando un contador lleva más de 10 h
// corriendo (AGENTS.md §2.6 "Un contador abierto más de 10 h genera una alerta", §7 jobs).
import type { Clock } from "@/domain/clock";
import { STALE_TIMER_MS } from "@/domain/tickets/time-entry-rules";
import type { PrismaClient } from "@/generated/prisma/client";
import { notify } from "@/server/notifications/notify";

export type WarnStaleTimersResult = { warned: number };

// POR QUÉ: una transacción por registro; la marca aviso_olvido_en evita repetir el aviso en la próxima corrida.
export async function warnStaleTimers(
  db: PrismaClient,
  clock: Clock,
): Promise<WarnStaleTimersResult> {
  const now = clock.now();
  const stale = await db.timeEntry.findMany({
    where: {
      endedAt: null,
      staleWarnedAt: null,
      startedAt: { lt: new Date(now.getTime() - STALE_TIMER_MS) },
    },
    select: {
      id: true,
      userId: true,
      ticket: {
        select: { id: true, number: true, title: true, ownerId: true },
      },
    },
  });
  let warned = 0;
  for (const entry of stale) {
    const didWarn = await db.$transaction(async (tx) => {
      const marked = await tx.timeEntry.updateMany({
        where: { id: entry.id, staleWarnedAt: null },
        data: { staleWarnedAt: now },
      });
      if (marked.count === 0) return false;
      const { ticket } = entry;
      await notify(tx, {
        event: "CONTADOR_OLVIDADO",
        userIds: [entry.userId, ...(ticket.ownerId ? [ticket.ownerId] : [])],
        title: `Ticket #${ticket.number}: un contador lleva más de 10 h corriendo`,
        body: `«${ticket.title}». Si ya terminaste, páusalo y corrige el registro con uno manual.`,
        link: `/tickets/${ticket.id}`,
      });
      return true;
    });
    if (didWarn) warned++;
  }
  return { warned };
}
