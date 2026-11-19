// src/features/tickets/components/project-summary-panel.tsx
// Resumen del proyecto en vista de tablero: avance, horas trabajadas, descontadas y sin bolsa, SLA y mediana de
// resolución, el gráfico semanal y el desglose por persona y por bolsa (AGENTS.md §2.6, §6). Sin montos.
import type { ReactNode } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { formatMinutes } from "@/lib/format-minutes";
import type { ProjectSummaryView } from "../queries/get-project-summary";
import { Breakdown, Tile } from "./ticket-summary-panel";

type Props = { summary: ProjectSummaryView; weekChart: ReactNode };

const pct = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("es-BO")}%`;

export function ProjectSummaryPanel({ summary: s, weekChart }: Props) {
  const { tickets: t } = s;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Tile
          label="Avance"
          value={pct(s.progressPct)}
          hint={`${t.closed + t.resolved} de ${t.total - t.cancelled} terminados · ${t.open} ${t.open === 1 ? "abierto" : "abiertos"}`}
        />
        <Tile
          label="Horas trabajadas"
          value={formatMinutes(s.realMinutes)}
          hint="Tiempo real registrado por todos"
        />
        <Tile
          label="Horas descontadas"
          value={formatMinutes(s.chargedMinutes)}
          hint="De los tickets cerrados, ponderadas y redondeadas"
        />
        <Tile
          label="Sin bolsa"
          value={formatMinutes(s.pendingMinutes)}
          hint={
            s.pendingMinutes > 0
              ? "Pendientes de aplicar a una bolsa"
              : "Todo lo cerrado se descontó"
          }
        />
        <Tile
          label="SLA cumplido"
          value={pct(s.sla.pct)}
          hint={`${s.sla.met} cumplidas · ${s.sla.missed} incumplidas`}
        />
        <Tile
          label="Mediana de resolución"
          value={
            s.medianResolutionMinutes === null
              ? "—"
              : formatMinutes(s.medianResolutionMinutes)
          }
          hint="De la creación a la resolución"
        />
      </div>
      {s.weeks.length > 0 && weekChart}
      <div className="grid gap-3 lg:grid-cols-2">
        <Breakdown
          title="Por persona"
          empty="Nadie registró tiempo todavía."
          rows={s.people.map((p) => ({
            id: p.id,
            label: `${p.name} · ${p.entries} reg.`,
            minutes: p.minutes,
            lead: (
              <PersonAvatar
                name={p.name}
                image={p.image}
                className="size-5 text-[10px]"
              />
            ),
          }))}
        />
        <Breakdown
          title="Descontado por bolsa"
          empty="Aún no se cerró ningún ticket con horas."
          rows={s.byBag}
        />
      </div>
    </div>
  );
}
