// src/server/tickets/import-historical-ticket.ts
// Crea un ticket de la carga histórica con sus fechas reales: alta y asignación a la apertura, tramos manuales
// a nombre de su ejecutor (no tardíos), paso a EN_PROGRESO con el primer tramo, resolución y, si va cerrado,
// el cierre normal que descuenta sus horas de la bolsa (AGENTS.md §2.6, regla 6, decisión 2026-11-19).
import type { HistoricalTicket } from "@/domain/tickets/parse-historical-rows";
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";
import { type ActionResult, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import { checkHistoricalTicket } from "./check-historical-ticket";
import { closeTicketHours } from "./close-ticket-hours";

export type ImportedTicket =
  | {
      outcome: "CREADO";
      ticketId: string;
      number: number;
      chargedMinutes: number;
      pendingMinutes: number;
    }
  | { outcome: "OMITIDO"; ticketId: string; number: number };

// POR QUÉ: un fallo después de escribir debe revertir el ticket entero; la action lo atrapa y devuelve su motivo.
export class HistoricalImportRollback extends Error {
  constructor(readonly result: ActionResult<never>) {
    super("carga histórica revertida");
  }
}

export async function importHistoricalTicket(
  tx: Tx,
  user: SessionUser,
  ticket: HistoricalTicket,
): Promise<ActionResult<ImportedTicket>> {
  if (ticket.ref) {
    const existing = await tx.ticket.findUnique({
      where: { previousRef: ticket.ref },
      select: { id: true, number: true },
    });
    if (existing)
      return actionOk({
        outcome: "OMITIDO",
        ticketId: existing.id,
        number: existing.number,
      });
  }
  const checked = await checkHistoricalTicket(tx, user, ticket);
  if (!checked.ok) return checked;
  const { input, bag } = checked.data;
  const created = await tx.ticket.create({
    data: {
      kind: input.kind,
      customerId: input.customerId,
      cityId: input.cityId,
      projectId: input.projectId,
      priority: input.priority,
      slaModality: bag?.modality ?? input.slaModality,
      title: input.title,
      description: input.description,
      ownerId: ticket.ownerId,
      createdById: user.id,
      createdAt: ticket.openedAt,
      isHistorical: true,
      previousRef: ticket.ref,
      areas: { create: input.areaIds.map((areaId) => ({ areaId })) },
      ...(bag && { bags: { create: { bagId: bag.id, priority: 1 } } }),
    },
    select: { id: true, number: true },
  });
  const ref = { ticketId: created.id, number: created.number };
  await tx.timeEntry.createMany({
    data: ticket.intervals.map((i) => ({
      ticketId: created.id,
      userId: i.executorId,
      startedAt: i.start,
      endedAt: i.end,
      source: "MANUAL" as const,
      isLate: false,
    })),
  });
  await replayStatuses(tx, user, created.id, ticket);
  if (ticket.status !== "CERRADO")
    return actionOk({
      outcome: "CREADO",
      ...ref,
      chargedMinutes: 0,
      pendingMinutes: 0,
    });
  const closed = await closeTicketHours(
    tx,
    user,
    { ticketId: created.id },
    ticket.resolvedAt ?? ticket.openedAt,
  );
  if (!closed.ok) throw new HistoricalImportRollback(closed);
  const { chargedMinutes, pendingMinutes } = closed.data;
  return actionOk({
    outcome: "CREADO",
    ...ref,
    chargedMinutes,
    pendingMinutes,
  });
}

// REGLA: cada paso queda en el historial inmutable de estados con la fecha en que ocurrió (§2.6, §8).
async function replayStatuses(
  tx: Tx,
  user: SessionUser,
  ticketId: string,
  ticket: HistoricalTicket,
) {
  const steps: [TicketStatus | null, TicketStatus, Date][] = [
    [null, "NUEVO", ticket.openedAt],
    ["NUEVO", "ASIGNADO", ticket.openedAt],
  ];
  if (ticket.status !== "ASIGNADO")
    steps.push([
      "ASIGNADO",
      "EN_PROGRESO",
      ticket.intervals[0]?.start ?? ticket.openedAt,
    ]);
  if (ticket.resolvedAt)
    steps.push(["EN_PROGRESO", "RESUELTO", ticket.resolvedAt]);
  for (const [from, to, now] of steps)
    await applyStatusChange(tx, { ticketId, from, to, actorId: user.id, now });
}
