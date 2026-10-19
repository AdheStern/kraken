// src/server/tickets/load-ticket-allocation.ts
// Arma la entrada de allocateTicketHours para un ticket bloqueado: intervalos cerrados, jerarquía de
// bolsas con su saldo bajo bloqueo, bolsas firmes y calendario de la ciudad (AGENTS.md §2.6, §3 cierre).
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { TimeInterval } from "@/domain/calendar/split-by-business-hours";
import type { AllocationBag } from "@/domain/hours/allocate-ticket-hours";
import { TICKET_ROUNDING_STEP_MINUTES } from "@/domain/hours/apply-rounding";
import { toWorkDeadline } from "@/domain/hours/expiry";
import type { BagModality } from "@/domain/hours/weigh-minutes";
import { loadBusinessCalendar } from "@/server/calendar/load-business-calendar";
import type { Tx } from "@/server/db";
import { lockBags } from "@/server/hours/lock-bags";
import { getIntParameter } from "@/server/parameters";
import type { LockedTicket } from "./lock-ticket";

export type TicketAllocationInput = {
  intervals: TimeInterval[];
  bags: AllocationBag[];
  calendar: BusinessCalendar;
  roundingStepMinutes: number;
};

type BagInfo = { modality: BagModality; expiresOn: Date | null };

export async function loadTicketAllocation(
  tx: Tx,
  ticket: LockedTicket,
): Promise<TicketAllocationInput> {
  const hierarchy = await tx.ticketBag.findMany({
    where: { ticketId: ticket.id },
    orderBy: { priority: "asc" },
    select: { bagId: true, bag: { select: BAG_INFO } },
  });
  const settled = await loadSettledMinutes(tx, ticket.id);
  // POR QUÉ: los saldos se leen después del bloqueo; así la revalidación dentro de la transacción es
  // la propia asignación y dos cierres sobre la misma bolsa nunca la sobregiran (§2.6 paso 4).
  const locked = await lockBags(tx, [
    ...hierarchy.map((h) => h.bagId),
    ...settled.keys(),
  ]);
  const bags: AllocationBag[] = [];
  for (const [bagId, { minutes, bag }] of settled)
    if (!hierarchy.some((h) => h.bagId === bagId))
      bags.push(toAllocationBag(bagId, bag, minutes, true));
  for (const { bagId, bag } of hierarchy) {
    const firm = settled.get(bagId);
    const current = locked.get(bagId);
    if (firm) bags.push(toAllocationBag(bagId, bag, firm.minutes, true));
    else if (current?.status === "ACTIVA")
      bags.push(toAllocationBag(bagId, bag, current.balanceMinutes, false));
  }
  const intervals = await loadClosedIntervals(tx, ticket.id);
  return {
    intervals,
    bags,
    calendar: await loadCalendarFor(tx, ticket.cityId, intervals),
    // REGLA [CONFIRMAR hacia arriba]: el paso es un parámetro editable sin desplegar (§2.6, regla 16).
    roundingStepMinutes: await getIntParameter(
      "horas.redondeo_minutos",
      TICKET_ROUNDING_STEP_MINUTES,
      tx,
    ),
  };
}

const BAG_INFO = { modality: true, expiresOn: true } as const;

// POR QUÉ: un CONSUMO sin REVERSO al cerrar solo existe si una reapertura lo dejó firme en una bolsa
// VENCIDA o CERRADA (decisión del 2026-10-19); entra delante si ya no está en la jerarquía.
async function loadSettledMinutes(tx: Tx, ticketId: string) {
  const movements = await tx.hourMovement.findMany({
    where: { ticketId, kind: "CONSUMO", reversedBy: { is: null } },
    orderBy: { createdAt: "asc" },
    select: { bagId: true, minutes: true, bag: { select: BAG_INFO } },
  });
  const settled = new Map<string, { minutes: number; bag: BagInfo }>();
  for (const { bagId, minutes, bag } of movements) {
    const previous = settled.get(bagId)?.minutes ?? 0;
    settled.set(bagId, { minutes: previous - minutes, bag });
  }
  return settled;
}

function toAllocationBag(
  bagId: string,
  { modality, expiresOn }: BagInfo,
  availableMinutes: number,
  isSettled: boolean,
): AllocationBag {
  const expiry = expiresOn ? expiresOn.toISOString().slice(0, 10) : null;
  return {
    bagId,
    modality,
    availableMinutes,
    acceptsWorkUntil: toWorkDeadline(expiry),
    isSettled,
  };
}

async function loadClosedIntervals(tx: Tx, ticketId: string) {
  const entries = await tx.timeEntry.findMany({
    where: { ticketId, endedAt: { not: null } },
    orderBy: { startedAt: "asc" },
    select: { startedAt: true, endedAt: true },
  });
  return entries.map((e) => ({ start: e.startedAt, end: e.endedAt as Date }));
}

async function loadCalendarFor(
  tx: Tx,
  cityId: string,
  intervals: readonly TimeInterval[],
): Promise<BusinessCalendar> {
  if (intervals.length === 0) return { slots: [], holidays: new Set() };
  const ends = intervals.map((i) => i.end.getTime());
  return loadBusinessCalendar(tx, cityId, {
    from: toBusinessDate(intervals[0].start),
    to: toBusinessDate(new Date(Math.max(...ends))),
  });
}
