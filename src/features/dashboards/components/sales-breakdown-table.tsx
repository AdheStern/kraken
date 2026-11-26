// src/features/dashboards/components/sales-breakdown-table.tsx
// Detalle del indicador de ventas: desglose por área, comercial, cliente, tecnología o ciudad, con la
// participación como barra fina de una sola serie (AGENTS.md §6; la tabla es su propia vista accesible).
import Link from "next/link";
import type { SalesDimension } from "@/domain/dashboards/sales-breakdown";
import { formatAmount } from "@/lib/format-amount";
import { cn } from "@/lib/utils";
import type { SalesDashboard } from "../types";

const DIMENSION_LABELS: Record<SalesDimension, string> = {
  AREA: "Área",
  COMERCIAL: "Comercial",
  CLIENTE: "Cliente",
  TECNOLOGIA: "Tecnología",
  CIUDAD: "Ciudad",
};

type Props = { breakdown: SalesDashboard["breakdown"]; query: string };

export function SalesBreakdownTable({ breakdown, query }: Props) {
  const link = (d: SalesDimension) =>
    `/tableros/ventas?${query}${query ? "&" : ""}desglose=${d.toLowerCase()}`;
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          Ventas por {DIMENSION_LABELS[breakdown.dimension].toLowerCase()}
        </h2>
        <nav aria-label="Desglose" className="flex flex-wrap gap-1">
          {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={link(key as SalesDimension)}
              aria-current={key === breakdown.dimension ? "true" : undefined}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                key === breakdown.dimension && "bg-muted text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {breakdown.rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay ventas aprobadas en este periodo. Elige otro periodo o revisa
          la bandeja de aprobaciones.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm sm:min-w-[36rem]">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">
                  {DIMENSION_LABELS[breakdown.dimension]}
                </th>
                <th className="hidden w-[30%] py-2 font-medium sm:table-cell">
                  Participación
                </th>
                <th className="py-2 text-right font-medium">Ventas (US$)</th>
                <th className="py-2 text-right font-medium">Margen (US$)</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">
                  CV
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {breakdown.rows.map((row) => (
                <tr
                  key={row.key ?? "sin"}
                  className="border-t border-border/60"
                >
                  <td className="max-w-56 truncate py-2 pr-3">{row.label}</td>
                  <td className="hidden py-2 pr-3 sm:table-cell">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 flex-1 rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-full bg-chart-1"
                          style={{
                            width: `${Math.min(row.sharePct ?? 0, 100)}%`,
                          }}
                        />
                      </span>
                      <span className="w-12 text-right text-xs text-muted-foreground">
                        {row.sharePct === null ? "—" : `${row.sharePct}%`}
                      </span>
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {formatAmount(row.saleUsd)}
                  </td>
                  <td className="py-2 text-right">
                    {formatAmount(row.marginUsd)}
                    {row.marginPct && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({row.marginPct}%)
                      </span>
                    )}
                  </td>
                  <td className="hidden py-2 text-right sm:table-cell">
                    {row.cvCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
