// src/features/dashboards/components/engineer-kpis.tsx
// Cifras de un ingeniero en el periodo: tiempo real y su reparto por horario, utilización, tickets a cargo, lo
// descontado, SLA, resolución, satisfacción del cliente, subtareas y calidad de registros (AGENTS.md §6). Sin montos.
import { formatMinutes } from "@/lib/format-minutes";
import type { EngineerDetail } from "../types";
import { KpiTile } from "./kpi-tile";

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

export function EngineerKpis({
  performance: p,
}: {
  performance: EngineerDetail["performance"];
}) {
  const tiles = [
    {
      label: "Tiempo registrado",
      value: formatMinutes(p.loggedMinutes),
      hint: `${formatMinutes(p.insideMinutes)} en horario · ${formatMinutes(p.outsideMinutes)} fuera (${pct(p.outsidePct)})`,
    },
    {
      label: "Utilización",
      value: pct(p.utilizationPct),
      hint:
        p.utilizationPct === null
          ? "Sin ciudad en su perfil: no hay horario contra el cual medir."
          : "Sobre las horas hábiles de su ciudad en el periodo.",
    },
    {
      label: "Tickets a cargo",
      value: String(p.ownedOpen),
      hint: `abiertos hoy · ${p.ownedResolved} resueltos y ${p.ownedClosed} cerrados en el periodo`,
    },
    {
      label: "Tickets trabajados",
      value: String(p.participated),
      hint: `con tiempo suyo en el periodo · ${p.subtasksCompleted} subtareas completadas`,
    },
    {
      label: "Horas descontadas",
      value: formatMinutes(p.chargedMinutes),
      hint: "de los tickets a su cargo cerrados en el periodo",
    },
    {
      label: "Cumplimiento de SLA",
      value: pct(p.sla.pct),
      hint: `${p.sla.met} cumplidos · ${p.sla.missed} fuera de plazo (tickets a su cargo)`,
    },
    {
      label: "Mediana de resolución",
      value:
        p.medianResolutionMinutes === null
          ? "—"
          : formatMinutes(Math.round(p.medianResolutionMinutes)),
      hint: "de la creación a la resolución, tickets a su cargo",
    },
    {
      label: "Satisfacción del cliente",
      value: pct(p.satisfaction.satisfiedPct),
      hint:
        p.satisfaction.answers === 0
          ? "Sin respuestas de conformidad en el periodo"
          : `${p.satisfaction.answers} respuestas · nota media ${p.satisfaction.averageRating ?? "—"} de 5 (tickets a su cargo)`,
    },
    {
      label: "Registros",
      value: String(p.entries.total),
      hint: `${p.entries.manual} manuales · ${p.entries.late} tardíos (${pct(p.entries.latePct)})`,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <KpiTile key={tile.label} {...tile} />
      ))}
    </div>
  );
}
