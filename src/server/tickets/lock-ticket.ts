// src/server/tickets/lock-ticket.ts
// Bloquea la fila de un ticket (SELECT … FOR UPDATE) y devuelve sus datos para cerrarlo o reabrirlo.
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";
import type { Tx } from "@/server/db";

export type LockedTicket = {
  id: string;
  number: number;
  status: TicketStatus;
  customerId: string;
  cityId: string;
};

type Row = {
  id: string;
  numero: number;
  estado: TicketStatus;
  cliente_id: string;
  ciudad_id: string;
};

// TRAMPA: el ticket se bloquea siempre antes que sus bolsas (lockBags); con un orden fijo, dos cierres
// del mismo ticket se serializan y el segundo ve el estado CERRADO.
export async function lockTicket(
  tx: Tx,
  ticketId: string,
): Promise<LockedTicket | null> {
  const [row] = await tx.$queryRaw<Row[]>`
    SELECT id::text AS id, numero, estado::text AS estado,
           cliente_id::text AS cliente_id, ciudad_id::text AS ciudad_id
    FROM tickets.ticket
    WHERE id = ${ticketId}::uuid
    FOR UPDATE`;
  if (!row) return null;
  return {
    id: row.id,
    number: row.numero,
    status: row.estado,
    customerId: row.cliente_id,
    cityId: row.ciudad_id,
  };
}
