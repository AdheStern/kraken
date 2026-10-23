// src/features/dashboards/components/operations-panels.tsx
// Paneles del tablero operativo: tickets abiertos por estado, registros (resolución, tardíos, fuera de horario)
// y las bolsas en riesgo de hoy con enlace a su libro (AGENTS.md §2.4, §2.6 y §6).
import Link from "next/link";
import type { ReactNode } from "react";
import { formatMinutes } from "@/lib/format-minutes";
import type { OperationsDashboard } from "../types";

const STATUS_LABELS: Record<string, string> = {
  NUEVO: "Nuevos",
  ASIGNADO: "Asignados",
  EN_PROGRESO: "En progreso",
  EN_ESPERA_CLIENTE: "Esperando al cliente",
  RESUELTO: "Resueltos sin cerrar",
};

export function OperationsPanels({ board }: { board: OperationsDashboard }) {
  const open = board.openTickets.reduce((acc, t) => acc + t.count, 0);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel title={`Tickets abiertos · ${open}`}>
        <dl className="flex flex-col gap-1.5 text-sm">
          {board.openTickets.map((t) => (
            <div key={t.status} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                {STATUS_LABELS[t.status]}
              </dt>
              <dd className="font-medium tabular-nums">{t.count}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Registros del periodo">
        <dl className="flex flex-col gap-1.5 text-sm">
          <Row
            label="Mediana de resolución"
            value={
              board.medianResolutionMinutes === null
                ? "—"
                : formatMinutes(Math.round(board.medianResolutionMinutes))
            }
          />
          <Row
            label="Fuera de horario"
            value={pctText(board.outsideHoursPct)}
          />
          <Row
            label="Cargados tarde (+48 h)"
            value={pctText(board.lateEntriesPct)}
          />
        </dl>
      </Panel>
      <Panel title="Bolsas en riesgo">
        {board.bagsAtRisk.top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguna bolsa supera el umbral de consumo ni vence pronto.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {board.bagsAtRisk.top.map((bag) => (
              <li
                key={bag.id}
                className="flex items-baseline justify-between gap-3"
              >
                <Link
                  href={`/horas/${bag.id}`}
                  className="min-w-0 truncate hover:underline"
                >
                  {bag.customerName} · {bag.cvLabel}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {bag.consumedPct}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

const pctText = (value: number | null) => (value === null ? "—" : `${value}%`);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
