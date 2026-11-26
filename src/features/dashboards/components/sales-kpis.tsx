// src/features/dashboards/components/sales-kpis.tsx
// Fila de cifras del tablero de ventas: ventas, margen, factor, horas y contratos por vigencia del periodo, contra el anterior
// y la meta (AGENTS.md §6). Montos exactos: nunca se compactan (PRODUCT.md).
import { formatAmount } from "@/lib/format-amount";
import { formatMinutes } from "@/lib/format-minutes";
import type { MoneyKpi, SalesDashboard } from "../types";
import { KpiTile } from "./kpi-tile";

const usd = (value: string) => `US$ ${formatAmount(value)}`;

export function SalesKpis({ board }: { board: SalesDashboard }) {
  const versus = board.previousLabel;
  return (
    <section
      aria-label="Cifras del periodo"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      <KpiTile
        label="Ventas aprobadas"
        value={usd(board.sales.valueUsd)}
        hint={`${board.cvCount} CV cerrados en ${board.periodLabel}`}
        variation={{ pct: board.sales.variationPct, versus }}
        goal={goalOf(board.sales)}
      />
      <KpiTile
        label="Margen bruto"
        value={usd(board.margin.valueUsd)}
        hint={
          board.margin.marginPct
            ? `${board.margin.marginPct}% sobre lo que tiene costo`
            : "Sin líneas con costo en el periodo"
        }
        variation={{ pct: board.margin.variationPct, versus }}
        goal={goalOf(board.margin)}
      />
      <KpiTile
        label="Factor ponderado"
        value={board.factor ?? "—"}
        hint={`Servicios propios aparte: ${usd(board.ownServicesUsd)}`}
      />
      <KpiTile
        label="Horas vendidas"
        value={formatMinutes(board.hoursSold.minutes)}
        variation={{ pct: board.hoursSold.variationPct, versus }}
        goal={
          board.hoursSold.goalMinutes === null
            ? undefined
            : {
                progressPct: board.hoursSold.progressPct,
                text: `${board.hoursSold.progressPct ?? 0}% de ${formatMinutes(board.hoursSold.goalMinutes)}`,
              }
        }
      />
      <KpiTile
        label="Contratos por vigencia"
        value={String(board.termContracts.count)}
        hint={
          board.termContracts.count === 0
            ? "Sin contratos de soporte por vigencia en el periodo"
            : `${board.termContracts.months} meses de soporte · ${usd(board.termContracts.saleUsd)}`
        }
        variation={{ pct: board.termContracts.variationPct, versus }}
      />
    </section>
  );
}

function goalOf(kpi: MoneyKpi) {
  if (kpi.goalUsd === null) return undefined;
  return {
    progressPct: kpi.progressPct,
    text: `${kpi.progressPct ?? 0}% de la meta de ${usd(kpi.goalUsd)}`,
  };
}
