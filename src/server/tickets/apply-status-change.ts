// src/server/tickets/apply-status-change.ts
// Cambia el estado de un ticket registrando su evento en el historial inmutable, del que se recalcula el
// SLA (AGENTS.md §2.7, §8). Único punto que escribe ticket.estado.
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";
import type { Tx } from "@/server/db";

type StatusChange = {
  ticketId: string;
  from: TicketStatus | null;
  to: TicketStatus;
  actorId: string;
  now: Date;
};

export async function applyStatusChange(
  tx: Tx,
  { ticketId, from, to, actorId, now }: StatusChange,
): Promise<void> {
  await tx.ticketStatusEvent.create({
    data: {
      ticketId,
      fromStatus: from,
      toStatus: to,
      actorId,
      occurredAt: now,
    },
  });
  await tx.ticket.update({
    where: { id: ticketId },
    data: {
      status: to,
      ...(to === "RESUELTO" && { resolvedAt: now }),
      ...(to === "CERRADO" && { closedAt: now }),
      ...(from === "CERRADO" && { closedAt: null }),
    },
  });
  // REGLA: primera respuesta = primer paso a EN_PROGRESO o primer comentario público del encargado (§2.7).
  if (to === "EN_PROGRESO")
    await tx.ticket.updateMany({
      where: { id: ticketId, firstResponseAt: null },
      data: { firstResponseAt: now },
    });
}
