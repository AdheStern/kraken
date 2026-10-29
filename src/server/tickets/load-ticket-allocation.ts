// src/server/tickets/load-ticket-allocation.ts
// Arma la entrada de allocateTicketHours para un ticket bloqueado: lo ya descontado como bolsas firmes, la
// jerarquía de bolsas con su saldo bajo bloqueo (un contrato sin tope, con capacidad de sobra) y el calendario de
// la ciudad (AGENTS.md §2.4, §2.6, §3 cierre).
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { TimeInterval } from "@/domain/calendar/split-by-business-hours";
import {
  type AllocationBag,
  UNCAPPED_MINUTES,
} from "@/domain/hours/allocate-ticket-hours";
import { TICKET_ROUNDING_STEP_MINUTES } from "@/domain/hours/apply-rounding";
import { toWorkDeadline, toWorkStart } from "@/domain/hours/expiry";
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

type BagInfo = {
  modality: BagModality;
  startsOn: Date | null;
  expiresOn: Date | null;
};

// POR QUÉ: con projectAt es la proyección de un ticket abierto (§2.6 "consumo proyectado"): no bloquea y
// cuenta los registros abiertos hasta ese instante. Sin él es el cierre, con las bolsas bloqueadas.
export async function loadTicketAllocation(
  tx: Tx,
  ticket: Pick<LockedTicket, "id" | "cityId">,
  { projectAt }: { projectAt?: Date } = {},
): Promise<TicketAllocationInput> {
  const hierarchy = await tx.ticketBag.findMany({
    where: { ticketId: ticket.id },
    orderBy: { priority: "asc" },
    select: { bagId: true, bag: { select: BAG_INFO } },
  });
  const settled = await loadSettledMinutes(tx, ticket.id);
  // POR QUÉ: los saldos se leen después del bloqueo; así la revalidación dentro de la transacción es
  // la propia asignación y dos cierres sobre la misma bolsa nunca la sobregiran (§2.6 paso 4).
  const bagIds = [...hierarchy.map((h) => h.bagId), ...settled.keys()];
  const locked = projectAt
    ? await readBags(tx, bagIds)
    : await lockBags(tx, bagIds);
  // REGLA: lo ya descontado va primero para que el trabajo anterior lo vuelva a ocupar; luego las bolsas
  // activas en su orden, también con el saldo que le queda a una firme (decisión 2026-10-29, §2.6).
  const bags: AllocationBag[] = [];
  for (const [bagId, { minutes, bag }] of settled)
    bags.push(toAllocationBag(bagId, bag, minutes, true));
  for (const { bagId, bag } of hierarchy) {
    const current = locked.get(bagId);
    if (current?.status === "ACTIVA")
      bags.push(
        toAllocationBag(
          bagId,
          bag,
          current.isUncapped ? UNCAPPED_MINUTES : current.balanceMinutes,
          false,
        ),
      );
  }
  const intervals = await loadIntervals(tx, ticket.id, projectAt);
  return {
    intervals,
    bags,
    calendar: await loadCalendarFor(tx, ticket.cityId, intervals),
    // REGLA: el redondeo es hacia arriba; su paso es un parámetro editable sin desplegar (§2.6).
    roundingStepMinutes: await getIntParameter(
      "horas.redondeo_minutos",
      TICKET_ROUNDING_STEP_MINUTES,
      tx,
    ),
  };
}

const BAG_INFO = { modality: true, startsOn: true, expiresOn: true } as const;

// POR QUÉ: un CONSUMO sin REVERSO al cerrar solo existe si el ticket se reabrió, que lo deja firme (decisión
// 2026-10-29); los REVERSO de reaperturas anteriores a esa decisión lo excluyen.
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
  { modality, startsOn, expiresOn }: BagInfo,
  availableMinutes: number,
  isSettled: boolean,
): AllocationBag {
  return {
    bagId,
    modality,
    availableMinutes,
    acceptsWorkUntil: toWorkDeadline(toDateText(expiresOn)),
    acceptsWorkFrom: toWorkStart(toDateText(startsOn)),
    isSettled,
  };
}

const toDateText = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : null;

async function readBags(tx: Tx, bagIds: readonly string[]) {
  const bags = await tx.hourBag.findMany({
    where: { id: { in: [...bagIds] } },
    select: { id: true, balanceMinutes: true, status: true, isUncapped: true },
  });
  return new Map(bags.map(({ id, ...bag }) => [id, bag]));
}

async function loadIntervals(
  tx: Tx,
  ticketId: string,
  projectAt: Date | undefined,
): Promise<TimeInterval[]> {
  const entries = await tx.timeEntry.findMany({
    where: {
      ticketId,
      ...(projectAt
        ? { startedAt: { lt: projectAt } }
        : { endedAt: { not: null } }),
    },
    orderBy: { startedAt: "asc" },
    select: { startedAt: true, endedAt: true },
  });
  return entries.map((e) => ({
    start: e.startedAt,
    end: e.endedAt ?? (projectAt as Date),
  }));
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
