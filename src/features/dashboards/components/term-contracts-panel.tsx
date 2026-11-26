// src/features/dashboards/components/term-contracts-panel.tsx
// Contratos por vigencia vendidos en el periodo, por duración: cuántos y su venta (AGENTS.md §2.4, §6).
import { formatAmount } from "@/lib/format-amount";
import type { TermContractsKpi } from "../types";

type Props = { contracts: TermContractsKpi; periodLabel: string };

export function TermContractsPanel({ contracts, periodLabel }: Props) {
  if (contracts.count === 0) return null;
  const undated = contracts.count - sumCounts(contracts.byDuration);
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <h2 className="text-sm font-medium">
        Contratos por vigencia por duración · {periodLabel}
      </h2>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-2 font-medium">Duración</th>
            <th className="py-2 text-right font-medium">Contratos</th>
            <th className="py-2 text-right font-medium">Ventas (US$)</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {contracts.byDuration.map((row) => (
            <tr key={row.months} className="border-t border-border/60">
              <td className="py-2">{durationLabel(row.months)}</td>
              <td className="py-2 text-right">{row.count}</td>
              <td className="py-2 text-right">{formatAmount(row.saleUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {undated > 0 && (
        <p className="text-xs text-muted-foreground">
          {undated === 1 ? "1 contrato" : `${undated} contratos`} sin fechas de
          vigencia válidas: corrige su inicio y fin en el CV para ver su
          duración.
        </p>
      )}
    </section>
  );
}

// POR QUÉ: los contratos se venden por años o por meses; 24 meses se lee mejor como «2 años».
function durationLabel(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 año" : `${years} años`;
  }
  return months === 1 ? "1 mes" : `${months} meses`;
}

function sumCounts(rows: readonly { count: number }[]): number {
  return rows.reduce((acc, row) => acc + row.count, 0);
}
