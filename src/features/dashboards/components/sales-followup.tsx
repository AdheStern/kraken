// src/features/dashboards/components/sales-followup.tsx
// Seguimiento comercial: pipeline por estado, tiempo de aprobación con lo que más espera y renovaciones de los
// próximos 90 días (AGENTS.md §2.3 "Sin delegación", §6).
import Link from "next/link";
import type { ReactNode } from "react";
import { formatAmount } from "@/lib/format-amount";
import { formatMinutes } from "@/lib/format-minutes";
import type { ApprovalTimes, PipelineStage, RenewalsView } from "../types";

const STAGE_LABELS: Record<PipelineStage["status"], string> = {
  BORRADOR: "En borrador",
  EN_APROBACION: "En aprobación",
  OBSERVADA: "Observados",
};

const MAX_RENEWALS = 6;

type Props = {
  pipeline: PipelineStage[];
  approvals: ApprovalTimes;
  renewals: RenewalsView;
};

export function SalesFollowup({ pipeline, approvals, renewals }: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel title="Pipeline">
        <dl className="flex flex-col gap-2 text-sm">
          {pipeline.map((stage) => (
            <div
              key={stage.status}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="text-muted-foreground">
                {STAGE_LABELS[stage.status]} · {stage.cvCount} CV
              </dt>
              <dd className="font-medium tabular-nums">
                US$ {formatAmount(stage.saleUsd)}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Aprobaciones">
        <p className="text-sm">
          {approvals.medianMinutes === null
            ? "Ninguna versión se aprobó en este periodo."
            : `Mediana de ${formatMinutes(approvals.medianMinutes)} entre envío y aprobación (${approvals.approvedCount} versiones).`}
        </p>
        {approvals.oldestPending ? (
          <Link
            href={`/cv/${approvals.oldestPending.cvId}`}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Espera hace {formatMinutes(approvals.oldestPending.waitingMinutes)}:{" "}
            {approvals.oldestPending.versionLabel} ·{" "}
            {approvals.oldestPending.requestLabel}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay solicitudes pendientes.
          </p>
        )}
      </Panel>
      <Panel title="Renovaciones próximas">
        <dl className="grid grid-cols-3 gap-2 text-center">
          {renewals.bands.map((band) => (
            <div key={band.days} className="rounded-lg bg-muted/60 px-2 py-1.5">
              <dt className="text-xs text-muted-foreground">
                {band.days - (band.days === 30 ? 30 : 29)}–{band.days} días
              </dt>
              <dd className="text-lg font-semibold">{band.count}</dd>
            </div>
          ))}
        </dl>
        {renewals.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada vence en los próximos 90 días.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {renewals.items.slice(0, MAX_RENEWALS).map((item) => (
              <li
                key={item.lineId}
                className="flex items-baseline justify-between gap-3"
              >
                <Link
                  href={`/cv/${item.cvId}`}
                  className="min-w-0 truncate hover:underline"
                >
                  {item.customerName} · {item.description}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.daysLeft} d
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
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
