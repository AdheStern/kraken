// src/features/admin/components/fx-history.tsx
// Últimas cargas del TC: desde cuándo rige, compra, venta, fuente y quién lo cargó si fue a mano.
import { cn } from "@/lib/utils";
import type { FxRateView } from "../types";
import { FX_SOURCE_LABELS, formatFxDate } from "./fx-labels";

export function FxHistory({ history }: { history: FxRateView[] }) {
  if (history.length === 0) return null;
  return (
    <div className="kr-solid overflow-x-auto rounded-xl">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b border-border/60">
            <th className="px-4 py-2 font-medium">Rige desde</th>
            <th className="px-4 py-2 text-right font-medium">Compra</th>
            <th className="px-4 py-2 text-right font-medium">Venta</th>
            <th className="px-4 py-2 font-medium">Fuente</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {history.map((r) => (
            <tr key={`${r.effectiveOn}-${r.source}`}>
              <td className="px-4 py-2 whitespace-nowrap">
                {formatFxDate(r.effectiveOn)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{r.buyRate}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {r.sellRate}
              </td>
              <td
                className={cn(
                  "px-4 py-2",
                  r.source === "MANUAL" && "text-muted-foreground",
                )}
              >
                {FX_SOURCE_LABELS[r.source]}
                {r.createdBy && ` · ${r.createdBy}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
