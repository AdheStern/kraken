// src/server/sla/evaluate-sla.ts
// Job sla.evaluate: recalcula el SLA de los tickets que siguen abiertos, para que el reloj avance y avise sin
// esperar a una acción del usuario (AGENTS.md §2.7, §7 jobs).
import type { Clock } from "@/domain/clock";
import type { PrismaClient } from "@/generated/prisma/client";
import { refreshTicketSla } from "./refresh-ticket-sla";

export type EvaluateSlaResult = { evaluated: number };

// POR QUÉ: una transacción por ticket; si uno falla, los demás se evalúan igual y el job reintenta.
export async function evaluateSla(
  db: PrismaClient,
  clock: Clock,
): Promise<EvaluateSlaResult> {
  const now = clock.now();
  const open = await db.ticket.findMany({
    where: {
      status: { in: ["NUEVO", "ASIGNADO", "EN_PROGRESO", "EN_ESPERA_CLIENTE"] },
    },
    select: { id: true },
  });
  for (const { id } of open)
    await db.$transaction((tx) => refreshTicketSla(tx, id, now));
  return { evaluated: open.length };
}
