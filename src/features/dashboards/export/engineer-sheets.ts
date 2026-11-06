// src/features/dashboards/export/engineer-sheets.ts
// El tablero de ingenieros en Excel: el listado (una fila por ingeniero) y el detalle de uno (resumen, tickets y
// semanas), con las mismas cifras y el mismo alcance que la pantalla (AGENTS.md §6 "exportación"). Horas con 2
// decimales; el tiempo se guarda en minutos (regla 4).
import type { SheetSpec } from "@/server/dashboards/sheets-to-xlsx";
import type { EngineerDetail, EngineerRow } from "../types";

const hours = (minutes: number | null) =>
  minutes === null ? null : Math.round((minutes / 60) * 100) / 100;

export function engineersSheets(board: {
  periodLabel: string;
  rows: EngineerRow[];
}): SheetSpec[] {
  return [
    {
      name: `Ingenieros ${board.periodLabel}`,
      columns: [
        { header: "Ingeniero", key: "name", width: 34 },
        { header: "Horas registradas", key: "logged" },
        { header: "Utilización %", key: "utilization", format: "pct" },
        { header: "Fuera de horario %", key: "outside", format: "pct" },
        { header: "Tickets resueltos a cargo", key: "resolved", format: "int" },
        { header: "Tickets trabajados", key: "participated", format: "int" },
        { header: "Horas descontadas (a cargo)", key: "charged" },
        { header: "SLA %", key: "sla", format: "pct" },
        { header: "Mediana de resolución (h)", key: "median" },
        { header: "Registros tardíos %", key: "late", format: "pct" },
        { header: "Clientes conformes %", key: "satisfied", format: "pct" },
      ],
      rows: board.rows.map((r) => ({
        name: r.name,
        logged: hours(r.loggedMinutes),
        utilization: r.utilizationPct,
        outside: r.outsidePct,
        resolved: r.ownedResolved,
        participated: r.participated,
        charged: hours(r.chargedMinutes),
        sla: r.slaPct,
        median: hours(r.medianResolutionMinutes),
        late: r.latePct,
        satisfied: r.satisfiedPct,
      })),
    },
  ];
}

const ROLE_TEXT = {
  ENCARGADO: "Encargado",
  SUBTAREA: "Subtarea",
  COLABORADOR: "Colaboró",
} as const;

export function engineerDetailSheets(detail: EngineerDetail): SheetSpec[] {
  const p = detail.performance;
  return [
    {
      name: `Resumen ${detail.periodLabel}`,
      columns: [
        { header: "Indicador", key: "label", width: 40 },
        { header: "Valor", key: "value", width: 14 },
      ],
      rows: [
        { label: "Horas registradas", value: hours(p.loggedMinutes) },
        { label: "Horas en horario", value: hours(p.insideMinutes) },
        { label: "Horas fuera de horario", value: hours(p.outsideMinutes) },
        { label: "Utilización %", value: p.utilizationPct },
        { label: "Tickets a cargo abiertos", value: p.ownedOpen },
        { label: "Tickets a cargo resueltos", value: p.ownedResolved },
        { label: "Tickets a cargo cerrados", value: p.ownedClosed },
        { label: "Tickets trabajados", value: p.participated },
        {
          label: "Horas descontadas (a cargo)",
          value: hours(p.chargedMinutes),
        },
        { label: "SLA %", value: p.sla.pct },
        {
          label: "Mediana de resolución (h)",
          value: hours(p.medianResolutionMinutes),
        },
        { label: "Subtareas completadas", value: p.subtasksCompleted },
        { label: "Registros", value: p.entries.total },
        { label: "Registros manuales", value: p.entries.manual },
        { label: "Registros tardíos %", value: p.entries.latePct },
        {
          label: "Clientes conformes %",
          value: p.satisfaction.satisfiedPct,
        },
        { label: "Nota media (1 a 5)", value: p.satisfaction.averageRating },
      ],
    },
    {
      name: "Tickets",
      columns: [
        { header: "Número", key: "number", format: "int" },
        { header: "Título", key: "title", width: 40 },
        { header: "Cliente", key: "customer", width: 30 },
        { header: "Estado", key: "status", width: 16 },
        { header: "Rol", key: "role", width: 14 },
        { header: "Horas suyas", key: "mine" },
        { header: "Horas descontadas", key: "charged" },
        { header: "SLA vencido", key: "slaMissed", width: 12 },
      ],
      rows: detail.tickets.map((t) => ({
        number: t.number,
        title: t.title,
        customer: t.customerName,
        status: t.status,
        role: ROLE_TEXT[t.role],
        mine: hours(t.myMinutes),
        charged: t.closedAt ? hours(t.chargedMinutes) : null,
        slaMissed: t.slaMissed ? "Sí" : "No",
      })),
    },
    {
      name: "Semanas",
      columns: [
        { header: "Semana (lunes)", key: "week", width: 16 },
        { header: "Horas", key: "hours" },
      ],
      rows: detail.weeks.map((w) => ({
        week: w.weekStart,
        hours: hours(w.minutes),
      })),
    },
  ];
}
