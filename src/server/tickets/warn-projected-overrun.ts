// src/server/tickets/warn-projected-overrun.ts
// Job bags.check-thresholds: avisa cuando el consumo proyectado de un ticket abierto supera el saldo de sus
// bolsas, una vez por ticket y bolsa (AGENTS.md §2.4 alertas "ticket abierto con horas proyectadas mayores al
// saldo", §7 jobs).
import type { Clock } from "@/domain/clock";
import { allocateTicketHours } from "@/domain/hours/allocate-ticket-hours";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { loadBagAudience } from "@/server/hours/notify-bag-alerts";
import { notify } from "@/server/notifications/notify";
import { loadTicketAllocation } from "./load-ticket-allocation";

export type WarnProjectedOverrunResult = { warned: number };

// POR QUÉ: corre cada 30 min en lugar de «tras cada cierre» para no acoplar la app a pg-boss; la proyección
// es la misma función del cierre (§2.6), así que el aviso coincide con lo que se descontaría.
export async function warnProjectedOverrun(
  db: PrismaClient,
  clock: Clock,
): Promise<WarnProjectedOverrunResult> {
  const now = clock.now();
  const tickets = await db.ticket.findMany({
    where: {
      status: { notIn: ["CERRADO", "CANCELADO"] },
      bags: { some: { projectionWarnedAt: null } },
    },
    select: { id: true, number: true, title: true, cityId: true },
  });
  let warned = 0;
  for (const ticket of tickets)
    warned += await db.$transaction((tx) => checkTicket(tx, ticket, now));
  return { warned };
}

type OpenTicket = { id: string; number: number; title: string; cityId: string };

async function checkTicket(
  tx: Tx,
  ticket: OpenTicket,
  now: Date,
): Promise<number> {
  const input = await loadTicketAllocation(tx, ticket, { projectAt: now });
  const allocation = allocateTicketHours(
    input.intervals,
    input.bags,
    input.calendar,
    Math.max(1, input.roundingStepMinutes),
  );
  const { insideMinutes, outsideMinutes } = allocation.pending;
  if (insideMinutes + outsideMinutes === 0) return 0;
  const pending = await tx.ticketBag.findMany({
    where: { ticketId: ticket.id, projectionWarnedAt: null },
    select: { bagId: true },
  });
  for (const { bagId } of pending) {
    await tx.ticketBag.update({
      where: { ticketId_bagId: { ticketId: ticket.id, bagId } },
      data: { projectionWarnedAt: now },
    });
    const audience = await loadBagAudience(tx, bagId);
    await notify(tx, {
      event: "BOLSA_PROYECCION",
      userIds: audience.userIds,
      title: `Ticket #${ticket.number}: el trabajo proyectado supera el saldo de ${audience.cvCode}`,
      body: `«${ticket.title}» de ${audience.customerName}. Suma otra bolsa al ticket o gestiona un CV con más horas.`,
      link: `/tickets/${ticket.id}`,
    });
  }
  return pending.length;
}
