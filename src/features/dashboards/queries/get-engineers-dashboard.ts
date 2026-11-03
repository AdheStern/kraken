// src/features/dashboards/queries/get-engineers-dashboard.ts
// Listado de desempeño por ingeniero de un periodo y su detalle (AGENTS.md §6). Sin montos (regla 12); cada rol
// ve los ingenieros de su alcance (scopeEngineerQuery).
import type { Clock } from "@/domain/clock";
import { minutesByWeek } from "@/domain/dashboards/engineer-weekly";
import { type PeriodRef, resolvePeriod } from "@/domain/dashboards/period";
import type { SessionUser } from "@/server/authz/roles";
import { systemClock } from "@/server/clock";
import type { EngineerDetail, EngineerRow, EngineerTicketRow } from "../types";
import {
  type EngineerFacts,
  loadEngineerPerformance,
} from "./load-engineer-performance";

type Filters = { period: PeriodRef; areaId: string | null };

export async function getEngineersDashboard(
  user: SessionUser,
  filters: Filters,
  clock: Clock = systemClock,
): Promise<{ periodLabel: string; rows: EngineerRow[] }> {
  const { label, window } = periodWindow(filters.period, clock);
  const facts = await loadEngineerPerformance(user, window, filters.areaId);
  return { periodLabel: label, rows: facts.map(toRow) };
}

// POR QUÉ: null si el ingeniero no está en el alcance del usuario; la página responde 404.
export async function getEngineerDetail(
  user: SessionUser,
  engineerId: string,
  filters: Filters,
  clock: Clock = systemClock,
): Promise<EngineerDetail | null> {
  const { label, window } = periodWindow(filters.period, clock);
  const [facts] = await loadEngineerPerformance(user, window, null, engineerId);
  if (!facts) return null;
  const { minutesByTicket, ...performance } = facts.performance;
  return {
    periodLabel: label,
    userId: facts.userId,
    name: facts.name,
    performance,
    weeks: minutesByWeek(facts.entries, window),
    tickets: facts.tickets.map((t) =>
      toTicketRow(t, facts.userId, minutesByTicket),
    ),
  };
}

function toRow({ userId, name, performance: p }: EngineerFacts): EngineerRow {
  return {
    userId,
    name,
    loggedMinutes: p.loggedMinutes,
    outsidePct: p.outsidePct,
    utilizationPct: p.utilizationPct,
    ownedResolved: p.ownedResolved,
    participated: p.participated,
    chargedMinutes: p.chargedMinutes,
    slaPct: p.sla.pct,
    medianResolutionMinutes: p.medianResolutionMinutes,
    latePct: p.entries.latePct,
  };
}

function toTicketRow(
  t: EngineerFacts["tickets"][number],
  engineerId: string,
  minutesByTicket: Map<string, number>,
): EngineerTicketRow {
  const role =
    t.ownerId === engineerId
      ? "ENCARGADO"
      : t.subtasks.some((s) => s.assigneeId === engineerId)
        ? "SUBTAREA"
        : "COLABORADOR";
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    customerName: t.customer.name,
    status: t.status,
    role,
    myMinutes: minutesByTicket.get(t.id) ?? 0,
    chargedMinutes: t.chargedMinutes,
    slaMissed: t.slaOutcomes.includes("INCUMPLIDO"),
    createdAt: t.createdAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
  };
}

// TRAMPA: un periodo en curso se mide hasta ahora y uno futuro deja la ventana vacía, no invertida (como el operativo).
function periodWindow(ref: PeriodRef, clock: Clock) {
  const period = resolvePeriod(ref);
  const now = clock.now();
  const end = now < period.end ? now : period.end;
  return {
    label: period.label,
    window: {
      start: period.start,
      end: end > period.start ? end : period.start,
    },
  };
}
