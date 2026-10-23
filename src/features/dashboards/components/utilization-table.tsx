// src/features/dashboards/components/utilization-table.tsx
// Utilización por ingeniero: minutos registrados sobre la capacidad hábil de su ciudad, con una barra fina de
// una sola serie que puede pasar de 100% (AGENTS.md §6). La tabla es su propia vista accesible.
import { formatMinutes } from "@/lib/format-minutes";
import { cn } from "@/lib/utils";
import type { UtilizationRow } from "../types";

export function UtilizationTable({ rows }: { rows: UtilizationRow[] }) {
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <h2 className="text-sm font-medium">Utilización por ingeniero</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay ingenieros en tu alcance. Los roles de ingeniero se asignan por
          grupos de Entra en Administración.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-2 font-medium">Ingeniero</th>
              <th className="hidden w-[35%] py-2 font-medium sm:table-cell">
                Utilización
              </th>
              <th className="py-2 text-right font-medium">Registrado</th>
              <th className="py-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row) => (
              <tr key={row.userId} className="border-t border-border/60">
                <td className="max-w-48 truncate py-2 pr-3">{row.name}</td>
                <td className="hidden py-2 pr-3 sm:table-cell">
                  <span
                    className="block h-1.5 rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        "block h-full rounded-full bg-chart-1",
                        (row.pct ?? 0) > 100 && "bg-warning",
                      )}
                      style={{ width: `${Math.min(row.pct ?? 0, 100)}%` }}
                    />
                  </span>
                </td>
                <td className="py-2 text-right">
                  {formatMinutes(row.loggedMinutes)}
                </td>
                <td className="py-2 text-right">
                  {row.pct === null ? (
                    <span className="text-xs text-muted-foreground">
                      Sin ciudad
                    </span>
                  ) : (
                    `${row.pct}%`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
