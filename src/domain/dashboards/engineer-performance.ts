// src/domain/dashboards/engineer-performance.ts
// Desempeño de un ingeniero en un periodo: su tiempo real (dentro y fuera de horario), utilización, tickets a cargo
// y en los que participó, horas descontadas, SLA, mediana de resolución, satisfacción del cliente y calidad de sus
// registros (AGENTS.md §6).
import type { BusinessCalendar } from "../calendar/business-calendar";
import type { TimeInterval } from "../calendar/split-by-business-hours";
import {
  customerSatisfaction,
  lateEntriesPct,
  medianResolutionMinutes,
  outsideHoursShare,
  type SlaOutcome,
  slaCompliance,
} from "./ticket-kpis";
import { loggedMinutesIn, utilizationPct } from "./utilization";

export type EngineerEntry = TimeInterval & {
  ticketId: string;
  source: "CONTADOR" | "MANUAL";
  isLate: boolean;
  // TRAMPA: el horario es el de la ciudad del ticket, no el del ingeniero (§2.5).
  calendar: BusinessCalendar;
};

export type EngineerTicket = {
  id: string;
  isOwner: boolean;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  // Neto descontado de sus bolsas (summarizeTicketWork), en minutos.
  chargedMinutes: number;
  slaOutcomes: SlaOutcome[];
  // Respuestas de conformidad del cliente a sus resoluciones (§2.11).
  conformities: { isSatisfied: boolean; rating: number | null; at: Date }[];
};

export type EngineerPerformance = {
  loggedMinutes: number;
  insideMinutes: number;
  outsideMinutes: number;
  outsidePct: number | null;
  utilizationPct: number | null;
  ownedOpen: number;
  ownedResolved: number;
  ownedClosed: number;
  participated: number;
  chargedMinutes: number;
  sla: { met: number; missed: number; pct: number | null };
  satisfaction: ReturnType<typeof customerSatisfaction>;
  medianResolutionMinutes: number | null;
  entries: {
    total: number;
    manual: number;
    late: number;
    latePct: number | null;
  };
  subtasksCompleted: number;
  minutesByTicket: Map<string, number>;
};

const FINISHED = new Set(["CERRADO", "CANCELADO", "RESUELTO"]);

export function summarizeEngineer(input: {
  window: TimeInterval;
  capacityMinutes: number | null;
  entries: readonly EngineerEntry[];
  tickets: readonly EngineerTicket[];
  subtasksCompleted: number;
}): EngineerPerformance {
  const { window, entries, tickets } = input;
  const clipped = entries.flatMap((e) => clip(e, window));
  const logged = loggedMinutesIn(entries, window);
  const hours = outsideHoursShare(clipped);
  const owned = tickets.filter((t) => t.isOwner);
  const resolved = owned.flatMap((t) =>
    t.resolvedAt && within(t.resolvedAt, window)
      ? [{ createdAt: t.createdAt, resolvedAt: t.resolvedAt }]
      : [],
  );
  const closed = owned.filter((t) => t.closedAt && within(t.closedAt, window));
  return {
    loggedMinutes: logged,
    ...hours,
    utilizationPct:
      input.capacityMinutes === null
        ? null
        : utilizationPct(logged, input.capacityMinutes),
    ownedOpen: owned.filter((t) => !FINISHED.has(t.status)).length,
    ownedResolved: resolved.length,
    ownedClosed: closed.length,
    participated: new Set(clipped.map((e) => e.ticketId)).size,
    // REGLA: el descuento es por ticket; se atribuye a su encargado, en el periodo en que se cerró (§6).
    chargedMinutes: closed.reduce((sum, t) => sum + t.chargedMinutes, 0),
    sla: slaCompliance(owned.flatMap((t) => t.slaOutcomes)),
    // REGLA: la conformidad se atribuye al encargado, en el periodo en que el cliente respondió (decisión 2026-11-05).
    satisfaction: customerSatisfaction(
      owned.flatMap((t) => t.conformities.filter((c) => within(c.at, window))),
    ),
    medianResolutionMinutes: medianResolutionMinutes(resolved),
    entries: entryQuality(clipped),
    subtasksCompleted: input.subtasksCompleted,
    minutesByTicket: minutesByTicket(entries, window),
  };
}

function entryQuality(entries: readonly EngineerEntry[]) {
  return {
    total: entries.length,
    manual: entries.filter((e) => e.source === "MANUAL").length,
    late: entries.filter((e) => e.isLate).length,
    latePct: lateEntriesPct(entries),
  };
}

function minutesByTicket(
  entries: readonly EngineerEntry[],
  window: TimeInterval,
) {
  const byTicket = new Map<string, number>();
  for (const entry of entries) {
    const minutes = loggedMinutesIn([entry], window);
    if (minutes > 0)
      byTicket.set(
        entry.ticketId,
        (byTicket.get(entry.ticketId) ?? 0) + minutes,
      );
  }
  return byTicket;
}

// REGLA: solo cuenta lo registrado dentro del periodo; un registro que lo cruza aporta su parte (§6).
export function clip<T extends TimeInterval>(
  entry: T,
  window: TimeInterval,
): T[] {
  const start = Math.max(entry.start.getTime(), window.start.getTime());
  const end = Math.min(entry.end.getTime(), window.end.getTime());
  return end > start
    ? [{ ...entry, start: new Date(start), end: new Date(end) }]
    : [];
}

function within(instant: Date, window: TimeInterval): boolean {
  return instant >= window.start && instant < window.end;
}
