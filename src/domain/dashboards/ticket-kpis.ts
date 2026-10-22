// src/domain/dashboards/ticket-kpis.ts
// Indicadores de tickets: cumplimiento de SLA, mediana de resolución, registros tardíos y tiempo fuera de
// horario (AGENTS.md §2.6, §2.7 y §6).
import type { BusinessCalendar } from "../calendar/business-calendar";
import {
  splitByBusinessHours,
  type TimeInterval,
} from "../calendar/split-by-business-hours";
import { median, sharePct } from "./stats";

export type SlaOutcome = "EN_CURSO" | "PAUSADO" | "CUMPLIDO" | "INCUMPLIDO";

const MINUTE_MS = 60_000;

// REGLA: solo cuentan las mediciones cerradas; una en curso o en pausa aún puede cumplirse (§2.7).
export function slaCompliance(outcomes: readonly SlaOutcome[]) {
  const met = outcomes.filter((o) => o === "CUMPLIDO").length;
  const missed = outcomes.filter((o) => o === "INCUMPLIDO").length;
  return { met, missed, pct: sharePct(met, met + missed) };
}

// POR QUÉ: tiempo de calendario de la creación a la resolución: es lo que vive el cliente, no el reloj del SLA.
export function medianResolutionMinutes(
  tickets: readonly { createdAt: Date; resolvedAt: Date }[],
): number | null {
  return median(
    tickets.map((t) =>
      Math.floor((t.resolvedAt.getTime() - t.createdAt.getTime()) / MINUTE_MS),
    ),
  );
}

export function lateEntriesPct(
  entries: readonly { isLate: boolean }[],
): number | null {
  return sharePct(entries.filter((e) => e.isLate).length, entries.length);
}

// TRAMPA: el horario y los feriados son los de la ciudad del ticket, no los del ingeniero (§2.5).
export function outsideHoursShare(
  entries: readonly (TimeInterval & { calendar: BusinessCalendar })[],
) {
  let insideMs = 0;
  let outsideMs = 0;
  for (const entry of entries) {
    for (const segment of splitByBusinessHours(entry, entry.calendar)) {
      const ms = segment.end.getTime() - segment.start.getTime();
      if (segment.isInside) insideMs += ms;
      else outsideMs += ms;
    }
  }
  return {
    insideMinutes: Math.round(insideMs / MINUTE_MS),
    outsideMinutes: Math.round(outsideMs / MINUTE_MS),
    outsidePct: sharePct(outsideMs, insideMs + outsideMs),
  };
}
