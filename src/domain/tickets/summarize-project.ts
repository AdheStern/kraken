// src/domain/tickets/summarize-project.ts
// Resumen operativo de un proyecto sobre todos sus tickets: conteo por estado y avance, horas reales, descontadas
// y sin bolsa, desglose por persona y por bolsa, SLA, mediana de resolución y horas por semana (AGENTS.md §2.6,
// §6). Sin montos (regla 12).
import { minutesByWeek, type WeekMinutes } from "../dashboards/engineer-weekly";
import { sharePct } from "../dashboards/stats";
import {
  medianResolutionMinutes,
  type SlaOutcome,
  slaCompliance,
} from "../dashboards/ticket-kpis";
import {
  summarizeTicketWork,
  type TicketMovement,
  type WorkEntry,
} from "./summarize-ticket-work";
import type { TicketStatus } from "./ticket-state-machine";

export type ProjectTicket = {
  status: TicketStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  entries: readonly WorkEntry[];
  movements: readonly TicketMovement[];
  pendingMinutes: number;
  slaOutcomes: readonly SlaOutcome[];
};

export type ProjectSummary = {
  tickets: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
    cancelled: number;
  };
  // POR QUÉ: los cancelados no cuentan para el avance; un resuelto ya terminó el trabajo aunque falte cerrarlo.
  progressPct: number | null;
  realMinutes: number;
  chargedMinutes: number;
  pendingMinutes: number;
  byPerson: Map<string, { minutes: number; entries: number }>;
  byBag: Map<string, number>;
  sla: ReturnType<typeof slaCompliance>;
  medianResolutionMinutes: number | null;
  weeks: WeekMinutes[];
};

export function summarizeProject(
  tickets: readonly ProjectTicket[],
): ProjectSummary {
  const count = (status: TicketStatus) =>
    tickets.filter((t) => t.status === status).length;
  const [resolved, closed, cancelled] = [
    count("RESUELTO"),
    count("CERRADO"),
    count("CANCELADO"),
  ];
  const entries = tickets.flatMap((t) => t.entries);
  const work = summarizeTicketWork(
    entries,
    tickets.flatMap((t) => t.movements),
  );
  return {
    tickets: {
      total: tickets.length,
      open: tickets.length - resolved - closed - cancelled,
      resolved,
      closed,
      cancelled,
    },
    progressPct: sharePct(resolved + closed, tickets.length - cancelled),
    realMinutes: work.realMinutes,
    chargedMinutes: work.chargedMinutes,
    pendingMinutes: tickets.reduce((sum, t) => sum + t.pendingMinutes, 0),
    byPerson: work.byPerson,
    byBag: work.byBag,
    sla: slaCompliance(tickets.flatMap((t) => t.slaOutcomes)),
    medianResolutionMinutes: medianResolutionMinutes(
      tickets.flatMap((t) =>
        t.resolvedAt
          ? [{ createdAt: t.createdAt, resolvedAt: t.resolvedAt }]
          : [],
      ),
    ),
    weeks: projectWeeks(entries),
  };
}

function projectWeeks(entries: readonly WorkEntry[]): WeekMinutes[] {
  const closed = entries.flatMap((e) =>
    e.endedAt ? [{ start: e.startedAt, end: e.endedAt }] : [],
  );
  if (closed.length === 0) return [];
  const start = new Date(Math.min(...closed.map((e) => e.start.getTime())));
  const end = new Date(Math.max(...closed.map((e) => e.end.getTime())));
  return minutesByWeek(closed, { start, end });
}
