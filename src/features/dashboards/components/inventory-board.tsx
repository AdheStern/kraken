// src/features/dashboards/components/inventory-board.tsx
// Tablero de inventario: valor total, salidas netas, rotación y tránsito, más el valor por almacén con una barra
// fina de una sola serie (AGENTS.md §2.8 y §6). Solo llega a quien ve costos.
import { formatAmount } from "@/lib/format-amount";
import type { InventoryDashboard } from "../types";
import { KpiTile } from "./kpi-tile";

const usd = (value: string) => `US$ ${formatAmount(value)}`;

export function InventoryBoard({ board }: { board: InventoryDashboard }) {
  const total = Number(board.totalValueUsd);
  return (
    <>
      <section
        aria-label="Cifras del periodo"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiTile
          label="Valor del inventario hoy"
          value={usd(board.totalValueUsd)}
        />
        <KpiTile
          label="Salidas netas"
          value={usd(board.outboundUsd)}
          hint={`Salidas menos devoluciones en ${board.periodLabel}`}
        />
        <KpiTile
          label="Rotación"
          value={board.turnover ?? "—"}
          hint={`Valor de ${usd(board.openingUsd)} al inicio y ${usd(board.closingUsd)} al cierre`}
        />
        <KpiTile
          label="En tránsito"
          value={usd(board.transit.valueUsd)}
          hint={`${board.transit.transfers} traspasos por recibir`}
        />
      </section>
      <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
        <h2 className="text-sm font-medium">Valor por almacén</h2>
        {board.warehouses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay almacenes activos. El administrador del sistema los crea en
            Administración → Almacenes.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Almacén</th>
                <th className="hidden w-[40%] py-2 font-medium sm:table-cell">
                  Participación
                </th>
                <th className="py-2 text-right font-medium">Valor (US$)</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {board.warehouses.map((w) => (
                <tr key={w.id} className="border-t border-border/60">
                  <td className="py-2 pr-3">{w.name}</td>
                  <td className="hidden py-2 pr-3 sm:table-cell">
                    <span
                      className="block h-1.5 rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full rounded-full bg-chart-1"
                        style={{
                          // POR QUÉ: el ancho es solo dibujo; el monto exacto va en su columna.
                          width: `${total > 0 ? (Number(w.valueUsd) * 100) / total : 0}%`,
                        }}
                      />
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {formatAmount(w.valueUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
