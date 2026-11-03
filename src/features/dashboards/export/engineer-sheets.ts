// src/features/dashboards/export/engineer-sheets.ts
// El tablero de ingenieros en una hoja de Excel: una fila por ingeniero con las mismas cifras y el mismo alcance
// que la pantalla (AGENTS.md §6 "exportación"). Horas con 2 decimales; el tiempo se guarda en minutos (regla 4).
import type { SheetSpec } from "@/server/dashboards/sheets-to-xlsx";
import type { EngineerRow } from "../types";

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
      })),
    },
  ];
}
