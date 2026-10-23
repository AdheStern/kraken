// src/features/dashboards/components/operations-kpis.tsx
// Fila de cifras del tablero operativo: horas vendidas y consumidas (ponderadas y reales), SLA de resolución y
// bolsas en riesgo hoy (AGENTS.md §6). Sin montos: lo ve también el ingeniero (regla 12).
import { formatMinutes } from "@/lib/format-minutes";
import type { OperationsDashboard } from "../types";
import { KpiTile } from "./kpi-tile";

const pct = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("en-US")}%`;

export function OperationsKpis({ board }: { board: OperationsDashboard }) {
  const { hours, sla } = board;
  return (
    <section
      aria-label="Cifras del periodo"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <KpiTile
        label="Horas vendidas"
        value={formatMinutes(hours.soldMinutes)}
        hint={`Vencidas sin usar: ${formatMinutes(hours.expiredMinutes)}`}
      />
      <KpiTile
        label="Horas descontadas"
        value={formatMinutes(hours.consumedWeightedMinutes)}
        hint={`${formatMinutes(hours.consumedRealMinutes)} reales · recargo ${formatMinutes(hours.surchargeMinutes)}`}
      />
      <KpiTile
        label="SLA de resolución"
        value={pct(sla.resolution.pct)}
        hint={`${sla.resolution.met} cumplidos · ${sla.resolution.missed} incumplidos · primera respuesta ${pct(sla.firstResponse.pct)}`}
      />
      <KpiTile
        label="Bolsas en riesgo hoy"
        value={String(board.bagsAtRisk.count)}
        hint={`Pendiente sin bolsa: ${formatMinutes(hours.pendingMinutes)}`}
      />
    </section>
  );
}
