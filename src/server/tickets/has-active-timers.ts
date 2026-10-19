// src/server/tickets/has-active-timers.ts
// Dice si un ticket tiene tiempo en curso: un registro sin fin o un contador sin TERMINAR (AGENTS.md §2.6).
import type { Tx } from "@/server/db";

// REGLA: el cierre exige que no haya contadores activos; uno pausado también cuenta, porque puede
// reanudarse y sumar tiempo después del descuento (§2.6, §8 contador).
export async function hasActiveTimers(
  tx: Tx,
  ticketId: string,
): Promise<boolean> {
  const open = await tx.timeEntry.count({
    where: { ticketId, endedAt: null },
  });
  if (open > 0) return true;
  const [running] = await tx.$queryRaw<{ contador_id: string }[]>`
    SELECT ultimo.contador_id::text AS contador_id
    FROM (
      SELECT DISTINCT ON (contador_id) contador_id, tipo
      FROM tickets.evento_contador
      WHERE ticket_id = ${ticketId}::uuid
      ORDER BY contador_id, ocurrido_en DESC, id DESC
    ) AS ultimo
    WHERE ultimo.tipo <> 'TERMINAR'
    LIMIT 1`;
  return running !== undefined;
}
