// src/features/sales-control/components/lines/cv-totals-panel.tsx
// Panel lateral fijo del editor: totales USD y Bs, factor global, margen, servicios propios, áreas y
// aprobadores que se generarán al enviar (AGENTS.md §2.2, §2.3 y §5).
import { TriangleAlert } from "lucide-react";
import { formatAmount } from "@/lib/format-amount";
import type { LinesSummary } from "../../line-pricing";

type Props = {
  summary: LinesSummary;
  /** null fuera de BORRADOR: las solicitudes reales están en el panel de aprobaciones. */
  approvers: string[] | null;
  thresholdUsd: string;
  canSeeCosts: boolean;
};

export function CvTotalsPanel({
  summary,
  approvers,
  thresholdUsd,
  canSeeCosts,
}: Props) {
  const { totals } = summary;

  return (
    <aside
      className="grid content-start gap-4 rounded-xl border bg-card p-4 lg:grid-cols-[minmax(180px,auto)_minmax(0,1fr)_minmax(220px,280px)] lg:gap-6 2xl:sticky 2xl:top-16 2xl:grid-cols-1 2xl:gap-4"
      aria-label="Totales del CV"
    >
      <div>
        <p className="text-xs text-muted-foreground">Venta total</p>
        <p className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
          USD {formatAmount(totals.totalSaleUsd.toFixed(2))}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          Bs {formatAmount(totals.totalSaleBs.toFixed(2))}
        </p>
      </div>
      {canSeeCosts && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 text-sm sm:grid-cols-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 2xl:grid-cols-2 2xl:border-t 2xl:border-l-0 2xl:pt-3 2xl:pl-0">
          <Metric
            label="Costo USD"
            value={formatAmount(totals.totalCostUsd.toFixed(2))}
          />
          <Metric
            label="Costo Bs"
            value={formatAmount(totals.totalCostBs.toFixed(2))}
          />
          <Metric
            label="Factor global"
            value={totals.factor ? totals.factor.toFixed(2) : "—"}
          />
          <Metric
            label="Margen"
            value={totals.marginPct ? `${totals.marginPct.toFixed(2)}%` : "—"}
          />
          <Metric
            label="Margen USD"
            value={formatAmount(totals.marginUsd.toFixed(2))}
          />
          <Metric
            label="Servicios propios"
            value={formatAmount(totals.ownServicesSaleUsd.toFixed(2))}
          />
        </dl>
      )}
      {summary.invalidCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/12 px-3 py-2 text-xs text-warning">
          <TriangleAlert
            className="mt-px size-3.5 shrink-0"
            aria-hidden="true"
          />
          {summary.invalidCount === 1
            ? "1 línea tiene"
            : `${summary.invalidCount} líneas tienen`}{" "}
          datos por completar y no suma.
        </p>
      )}
      {approvers && (
        <div className="grid content-start gap-2 border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 2xl:border-t 2xl:border-l-0 2xl:pt-3 2xl:pl-0">
          <p className="text-xs font-medium text-muted-foreground">
            Aprobarán al enviar
          </p>
          {approvers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Agrega líneas con área para ver los aprobadores.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {approvers.map((label) => (
                <li
                  key={label}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${label === "Gerente general" ? "bg-primary/10 text-primary" : "bg-secondary"}`}
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            El gerente general se suma desde USD {formatAmount(thresholdUsd)}.
          </p>
        </div>
      )}
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
