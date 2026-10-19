// src/domain/sla/compute-sla.ts
// Reloj del SLA de un ticket recalculado desde su historial de estados: primera respuesta y resolución, con
// pausa en EN_ESPERA_CLIENTE y el horario de la ciudad en 8x5. Regla normativa: AGENTS.md §2.7.
import {
  addBusinessMinutes,
  businessMsBetween,
} from "@/domain/calendar/add-business-minutes";
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import type { BagModality } from "@/domain/hours/weigh-minutes";
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";

export type SlaKind = "PRIMERA_RESPUESTA" | "RESOLUCION";
export type SlaStatus = "EN_CURSO" | "PAUSADO" | "CUMPLIDO" | "INCUMPLIDO";

export type SlaInput = {
  // POR QUÉ: el primer evento (alta) marca el inicio; los demás, cada cambio de estado.
  events: readonly { to: TicketStatus; at: Date }[];
  firstPublicCommentAt: Date | null;
  modality: BagModality;
  targets: { firstResponseMinutes: number; resolutionMinutes: number };
  calendar: BusinessCalendar;
  now: Date;
};

export type SlaClock = {
  kind: SlaKind;
  status: SlaStatus;
  elapsedMinutes: number;
  targetMinutes: number;
  pct: number;
  dueAt: Date | null;
  metAt: Date | null;
};

// REGLA: el reloj corre mientras se espera la atención; se pausa en EN_ESPERA_CLIENTE y no corre con el
// ticket resuelto, cerrado o cancelado (§2.7).
const COUNTING: ReadonlySet<TicketStatus> = new Set([
  "NUEVO",
  "ASIGNADO",
  "EN_PROGRESO",
]);

type Span = { status: TicketStatus; start: Date; end: Date };

export function computeSla(input: SlaInput): [SlaClock, SlaClock] {
  const events = [...input.events].sort(
    (a, b) => a.at.getTime() - b.at.getTime(),
  );
  if (events.length === 0)
    throw new RangeError("Un ticket siempre tiene su evento de alta.");
  const spans = toSpans(events, input.now);
  const current = events[events.length - 1].to;
  const firstProgress = events.find((e) => e.to === "EN_PROGRESO")?.at ?? null;
  const resolvedAt = ["RESUELTO", "CERRADO", "CANCELADO"].includes(current)
    ? ([...events]
        .reverse()
        .find((e) => e.to === "RESUELTO" || e.to === "CANCELADO")?.at ??
      input.now)
    : null;
  // POR QUÉ: resolver sin haber pasado por EN_PROGRESO también responde al cliente.
  const firstResponseAt = earliest(
    earliest(firstProgress, input.firstPublicCommentAt),
    resolvedAt,
  );
  return [
    clock(
      "PRIMERA_RESPUESTA",
      input.targets.firstResponseMinutes,
      firstResponseAt,
      current,
      spans,
      input,
    ),
    clock(
      "RESOLUCION",
      input.targets.resolutionMinutes,
      resolvedAt,
      current,
      spans,
      input,
    ),
  ];
}

function clock(
  kind: SlaKind,
  targetMinutes: number,
  stoppedAt: Date | null,
  current: TicketStatus,
  spans: readonly Span[],
  input: SlaInput,
): SlaClock {
  const until = stoppedAt && stoppedAt < input.now ? stoppedAt : input.now;
  const elapsedMinutes = Math.floor(countedMs(spans, until, input) / 60_000);
  const pct = Math.floor((elapsedMinutes * 100) / targetMinutes);
  const isBreached = elapsedMinutes > targetMinutes;
  if (stoppedAt)
    return {
      kind,
      status: isBreached ? "INCUMPLIDO" : "CUMPLIDO",
      elapsedMinutes,
      targetMinutes,
      pct,
      dueAt: null,
      metAt: stoppedAt,
    };
  const isPaused = !COUNTING.has(current);
  const dueAt =
    isBreached || isPaused
      ? null
      : dueFrom(input.now, targetMinutes - elapsedMinutes, input);
  const status: SlaStatus = isBreached
    ? "INCUMPLIDO"
    : isPaused
      ? "PAUSADO"
      : "EN_CURSO";
  return {
    kind,
    status,
    elapsedMinutes,
    targetMinutes,
    pct,
    dueAt,
    metAt: null,
  };
}

function toSpans(
  events: readonly { to: TicketStatus; at: Date }[],
  now: Date,
): Span[] {
  return events.map((event, i) => ({
    status: event.to,
    start: event.at,
    end: events[i + 1]?.at ?? (now > event.at ? now : event.at),
  }));
}

// Estrategia por modalidad (§9 Strategy): 8x5 cuenta solo el horario de oficina; 24x7, todo.
function countedMs(
  spans: readonly Span[],
  until: Date,
  input: SlaInput,
): number {
  let total = 0;
  for (const span of spans) {
    if (!COUNTING.has(span.status) || span.start >= until) continue;
    const end = span.end < until ? span.end : until;
    total +=
      input.modality === "H24X7"
        ? end.getTime() - span.start.getTime()
        : businessMsBetween(span.start, end, input.calendar);
  }
  return total;
}

function dueFrom(
  now: Date,
  remainingMinutes: number,
  input: SlaInput,
): Date | null {
  return input.modality === "H24X7"
    ? new Date(now.getTime() + remainingMinutes * 60_000)
    : addBusinessMinutes(now, remainingMinutes, input.calendar);
}

function earliest(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}
