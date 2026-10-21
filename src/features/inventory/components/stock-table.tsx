// src/features/inventory/components/stock-table.tsx
// Stock de un almacén: cantidad, reservado y disponible; el faltante se dice con texto («faltan 3»), nunca solo
// con color. Valor y promedio aparecen solo si llegaron (quien ve costos), con enlace al kardex.
import Link from "next/link";
import { formatAmount } from "@/lib/format-amount";
import { cn } from "@/lib/utils";
import type { StockRow } from "../types";
import { formatQuantity } from "./inventory-labels";

type Props = { rows: StockRow[]; warehouseCode: string; showCosts: boolean };

export function StockTable({ rows, warehouseCode, showCosts }: Props) {
  return (
    <div className="kr-solid overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead className="hidden border-b text-left text-xs text-muted-foreground md:table-header-group">
          <tr>
            <th className="px-4 py-2.5 font-medium">Producto</th>
            <th className="px-4 py-2.5 text-right font-medium">En stock</th>
            <th className="px-4 py-2.5 text-right font-medium">Reservado</th>
            <th className="px-4 py-2.5 text-right font-medium">Disponible</th>
            {showCosts && (
              <th className="px-4 py-2.5 text-right font-medium">
                Costo promedio
              </th>
            )}
            {showCosts && (
              <th className="px-4 py-2.5 text-right font-medium">Valor USD</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const shortage = row.availableQuantity.startsWith("-");
            return (
              <tr
                key={row.productId}
                className="grid grid-cols-3 gap-x-3 gap-y-1 px-4 py-3 md:table-row md:px-0 md:py-0"
              >
                <td className="col-span-3 min-w-0 md:px-4 md:py-3">
                  {showCosts ? (
                    <Link
                      href={`/inventario/${warehouseCode}/${row.productId}`}
                      className="font-mono text-xs font-medium underline-offset-4 hover:underline"
                    >
                      {row.productCode}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs font-medium">
                      {row.productCode}
                    </span>
                  )}
                  <span className="block truncate text-muted-foreground">
                    {row.description}
                  </span>
                </td>
                <Figure label="En stock" value={formatQuantity(row.quantity)} />
                <Figure
                  label="Reservado"
                  value={formatQuantity(row.reservedQuantity)}
                />
                <td className="text-right tabular-nums md:px-4 md:py-3">
                  <span className="block text-xs text-muted-foreground md:hidden">
                    Disponible
                  </span>
                  <span
                    className={cn("font-medium", shortage && "text-warning")}
                  >
                    {shortage
                      ? `faltan ${formatQuantity(row.availableQuantity.slice(1))}`
                      : formatQuantity(row.availableQuantity)}
                  </span>
                </td>
                {showCosts && (
                  <Figure
                    label="Costo promedio"
                    value={
                      row.averageCostUsd
                        ? formatAmount(row.averageCostUsd)
                        : "—"
                    }
                  />
                )}
                {showCosts && (
                  <Figure
                    label="Valor USD"
                    value={formatAmount(row.valueUsd ?? "0")}
                  />
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <td className="text-right tabular-nums md:px-4 md:py-3 md:whitespace-nowrap">
      <span className="block text-xs text-muted-foreground md:hidden">
        {label}
      </span>
      {value}
    </td>
  );
}
