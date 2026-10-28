// src/server/tickets/lock-ticket-request.ts
// Bloquea la fila de una solicitud de ticket (SELECT … FOR UPDATE) para atenderla una sola vez (AGENTS.md §2.6).
import type { TicketRequestStatus } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";

export type LockedTicketRequest = {
  id: string;
  number: number;
  status: TicketRequestStatus;
  areaId: string;
  requesterId: string;
  title: string;
};

type Row = {
  id: string;
  numero: number;
  estado: TicketRequestStatus;
  area_id: string;
  solicitante_id: string;
  titulo: string;
};

// TRAMPA: dos coordinadores pueden atender la misma solicitud a la vez; el bloqueo hace que el segundo la vea
// ATENDIDA o DESCARTADA.
export async function lockTicketRequest(
  tx: Tx,
  requestId: string,
): Promise<LockedTicketRequest | null> {
  const [row] = await tx.$queryRaw<Row[]>`
    SELECT id::text AS id, numero, estado::text AS estado, area_id::text AS area_id,
           solicitante_id, titulo
    FROM tickets.solicitud
    WHERE id = ${requestId}::uuid
    FOR UPDATE`;
  if (!row) return null;
  return {
    id: row.id,
    number: row.numero,
    status: row.estado,
    areaId: row.area_id,
    requesterId: row.solicitante_id,
    title: row.titulo,
  };
}
