// src/server/tickets/record-pending-hours.ts
// Guarda los minutos de un ticket que no alcanzaron bolsa y avisa al comercial y al gerente
// (AGENTS.md §2.6 paso 5): no se descuentan ni se pierden; se aplican al asociar un CV nuevo.
import { formatMinutes } from "@/lib/format-minutes";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import type { LockedTicket } from "./lock-ticket";

type Pending = { insideMinutes: number; outsideMinutes: number };

export async function recordPendingHours(
  tx: Tx,
  ticket: LockedTicket,
  pending: Pending,
  actorId: string,
): Promise<void> {
  await tx.pendingHours.create({
    data: {
      ticketId: ticket.id,
      customerId: ticket.customerId,
      insideMinutes: pending.insideMinutes,
      outsideMinutes: pending.outsideMinutes,
    },
  });
  const total = pending.insideMinutes + pending.outsideMinutes;
  await notify(tx, {
    event: "HORAS_PENDIENTES",
    userIds: (await loadPendingAudience(tx, ticket.id)).filter(
      (id) => id !== actorId,
    ),
    title: `Ticket #${ticket.number}: ${formatMinutes(total)} sin bolsa`,
    body: `Al cerrar el ticket no alcanzó el saldo de sus bolsas: ${formatMinutes(pending.insideMinutes)} dentro y ${formatMinutes(pending.outsideMinutes)} fuera de horario. Asocia un CV con horas para aplicarlas.`,
    link: `/tickets/${ticket.id}`,
  });
}

// REGLA: avisa a los vendedores de los CV de las bolsas del ticket y a los gerentes de sus áreas; sin
// bolsas, solo a los gerentes (supuesto declarado en el plan de la F3).
async function loadPendingAudience(
  tx: Tx,
  ticketId: string,
): Promise<string[]> {
  const sellers = await tx.cvVersionSeller.findMany({
    where: {
      version: {
        lines: { some: { hourBag: { ticketBags: { some: { ticketId } } } } },
      },
    },
    select: { userId: true },
  });
  const managers = await tx.userRole.findMany({
    where: {
      role: { code: "GERENTE_AREA" },
      area: { tickets: { some: { ticketId } } },
      user: { isActive: true },
    },
    select: { userId: true },
  });
  return [...sellers, ...managers].map((row) => row.userId);
}
