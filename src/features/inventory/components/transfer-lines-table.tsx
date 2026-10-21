// src/features/inventory/components/transfer-lines-table.tsx
// Líneas de un traspaso: lo enviado, lo recibido, lo dado de baja y lo que sigue en tránsito, siempre visible.
import { cn } from "@/lib/utils";
import type { TransferLineView } from "../types";
import { formatQuantity } from "./inventory-labels";

const COLUMNS = [
  ["sentQuantity", "Enviado"],
  ["receivedQuantity", "Recibido"],
  ["writtenOffQuantity", "De baja"],
  ["pendingQuantity", "En camino"],
] as const;

export function TransferLinesTable({ lines }: { lines: TransferLineView[] }) {
  return (
    <div className="kr-solid overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead className="hidden border-b text-left text-xs text-muted-foreground md:table-header-group">
          <tr>
            <th className="px-4 py-2.5 font-medium">Producto</th>
            {COLUMNS.map(([key, label]) => (
              <th key={key} className="px-4 py-2.5 text-right font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((line) => (
            <tr
              key={line.id}
              className="grid grid-cols-4 gap-x-3 gap-y-1 px-4 py-3 md:table-row md:px-0 md:py-0"
            >
              <td className="col-span-4 min-w-0 md:px-4 md:py-3">
                <span className="font-mono text-xs font-medium">
                  {line.productCode}
                </span>
                <span className="block truncate text-muted-foreground">
                  {line.description}
                  {line.serial && ` · serial ${line.serial}`}
                </span>
              </td>
              {COLUMNS.map(([key, label]) => (
                <td
                  key={key}
                  className={cn(
                    "text-right tabular-nums md:px-4 md:py-3",
                    key === "pendingQuantity" &&
                      line.pendingQuantity !== "0.00" &&
                      "font-medium text-warning",
                  )}
                >
                  <span className="block text-xs text-muted-foreground md:hidden">
                    {label}
                  </span>
                  {formatQuantity(line[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
