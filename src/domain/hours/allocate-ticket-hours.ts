// src/domain/hours/allocate-ticket-hours.ts
// Asigna los intervalos de un ticket a sus bolsas por jerarquía, pondera por modalidad
// y redondea el total a 30 min. Regla normativa: AGENTS.md §2.6 y caso HORAS-01 (§15.2).
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import {
  type BusinessSegment,
  splitByBusinessHours,
  type TimeInterval,
} from "@/domain/calendar/split-by-business-hours";
import { applyRounding, TICKET_ROUNDING_STEP_MINUTES } from "./apply-rounding";
import { type BagModality, OUTSIDE_HOURS_MULTIPLIER } from "./weigh-minutes";

const MINUTE_MS = 60_000;

export type AllocationBag = {
  bagId: string;
  modality: BagModality;
  // POR QUÉ: en una bolsa firme es el consumo que ya conserva de un cierre anterior, no su saldo.
  availableMinutes: number;
  // REGLA: la bolsa no acepta trabajo realizado desde este instante (§2.4 vencimiento); null = sin vencimiento.
  acceptsWorkUntil: Date | null;
  // POR QUÉ: al reabrir, el consumo en una bolsa VENCIDA o CERRADA queda firme (decisión del 2026-10-19);
  // al volver a cerrar recibe sus minutos para no cobrarlos dos veces, pero no se descuenta ni absorbe redondeo.
  isSettled: boolean;
};

export type BagConsumption = {
  bagId: string;
  minutes: number; // total a descontar, redondeo incluido
  roundingMinutes: number;
  isSettled: boolean;
};

export type TicketAllocation = {
  consumptions: BagConsumption[];
  pending: { insideMinutes: number; outsideMinutes: number };
  realMinutes: number;
  weightedMinutes: number;
  chargedMinutes: number;
  waivedRoundingMinutes: number;
};

type BagCursor = { bag: AllocationBag; capacityMs: number; weightedMs: number };
type PendingMs = { insideMs: number; outsideMs: number };

// POR QUÉ: se trabaja en milisegundos enteros porque los contadores guardan la hora exacta del servidor;
// la fracción de minuto ponderado se sube al minuto una vez por bolsa (§2.6 paso 2).
export function allocateTicketHours(
  intervals: readonly TimeInterval[],
  bags: readonly AllocationBag[],
  calendar: BusinessCalendar,
  roundingStepMinutes: number = TICKET_ROUNDING_STEP_MINUTES,
): TicketAllocation {
  for (const bag of bags) assertBag(bag);
  const cursors: BagCursor[] = bags.map((bag) => ({
    bag,
    capacityMs: bag.availableMinutes * MINUTE_MS,
    weightedMs: 0,
  }));
  const pending: PendingMs = { insideMs: 0, outsideMs: 0 };
  let realMs = 0;
  for (const segment of toChronologicalSegments(intervals, calendar)) {
    realMs += segment.end.getTime() - segment.start.getTime();
    allocateSegment(segment, cursors, pending);
  }
  return summarize(cursors, pending, realMs, roundingStepMinutes);
}

// REGLA: todos los intervalos del ticket, de todos los participantes, en orden cronológico; el tiempo de
// personas distintas se suma (§2.6, confirmado por DIMA).
function toChronologicalSegments(
  intervals: readonly TimeInterval[],
  calendar: BusinessCalendar,
): BusinessSegment[] {
  return intervals
    .flatMap((interval) => splitByBusinessHours(interval, calendar))
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        a.end.getTime() - b.end.getTime(),
    );
}

// REGLA: se llenan las bolsas en orden de prioridad sobre minutos reales; cada minuto se pondera con la
// modalidad de la bolsa que lo recibe (§2.6 paso 2, modalidades mezcladas de §15.2).
function allocateSegment(
  segment: BusinessSegment,
  cursors: BagCursor[],
  pending: PendingMs,
): void {
  const to = segment.end.getTime();
  let from = segment.start.getTime();
  while (from < to) {
    const cursor = cursors.find((c) => canReceive(c, segment.isInside, from));
    if (!cursor) {
      if (segment.isInside) pending.insideMs += to - from;
      else pending.outsideMs += to - from;
      return;
    }
    const multiplier = multiplierOf(cursor.bag, segment.isInside);
    const deadline = cursor.bag.acceptsWorkUntil?.getTime() ?? to;
    const takenMs = Math.min(
      Math.min(to, deadline) - from,
      Math.floor(cursor.capacityMs / multiplier),
    );
    cursor.capacityMs -= takenMs * multiplier;
    cursor.weightedMs += takenMs * multiplier;
    from += takenMs;
  }
}

function canReceive(cursor: BagCursor, isInside: boolean, at: number) {
  const deadline = cursor.bag.acceptsWorkUntil;
  return (
    cursor.capacityMs >= multiplierOf(cursor.bag, isInside) &&
    (deadline === null || at < deadline.getTime())
  );
}

function multiplierOf(bag: AllocationBag, isInside: boolean): number {
  return isInside ? 1 : OUTSIDE_HOURS_MULTIPLIER[bag.modality];
}

function summarize(
  cursors: readonly BagCursor[],
  pending: PendingMs,
  realMs: number,
  roundingStepMinutes: number,
): TicketAllocation {
  const slots = cursors.map(({ bag, weightedMs }) => ({
    minutes: Math.ceil(weightedMs / MINUTE_MS),
    availableMinutes: bag.availableMinutes,
    isSettled: bag.isSettled,
  }));
  const { roundingMinutes, waivedMinutes } = applyRounding(
    slots,
    roundingStepMinutes,
  );
  const consumptions = cursors
    .map(({ bag }, i) => ({
      bagId: bag.bagId,
      minutes: slots[i].minutes + roundingMinutes[i],
      roundingMinutes: roundingMinutes[i],
      isSettled: bag.isSettled,
    }))
    .filter((consumption) => consumption.minutes > 0);
  const weightedMinutes = slots.reduce((sum, s) => sum + s.minutes, 0);
  const roundedMinutes = roundingMinutes.reduce((sum, m) => sum + m, 0);
  return {
    consumptions,
    pending: {
      insideMinutes: Math.ceil(pending.insideMs / MINUTE_MS),
      outsideMinutes: Math.ceil(pending.outsideMs / MINUTE_MS),
    },
    realMinutes: Math.ceil(realMs / MINUTE_MS),
    weightedMinutes,
    chargedMinutes: weightedMinutes + roundedMinutes,
    waivedRoundingMinutes: waivedMinutes,
  };
}

function assertBag({ bagId, availableMinutes }: AllocationBag): void {
  if (!Number.isInteger(availableMinutes) || availableMinutes < 0)
    throw new RangeError(
      `La bolsa ${bagId} debe tener minutos enteros no negativos.`,
    );
}
