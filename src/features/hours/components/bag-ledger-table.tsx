// src/features/hours/components/bag-ledger-table.tsx
// Libro mayor de una bolsa: cada movimiento con signo explícito, saldo después del movimiento, ticket que lo
// originó, motivo y quién lo registró; en un contrato sin tope, lo usado en lugar del saldo (AGENTS.md §2.4 libro
// mayor, §5 "el libro enlaza al ticket").
import { formatMinutes } from "@/lib/format-minutes";
import { cn } from "@/lib/utils";
import type { BagLedgerEntry } from "../types";
import { MOVEMENT_LABELS } from "./bag-labels";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

// POR QUÉ: el signo va escrito (+/−); el color solo acompaña (WCAG: nunca solo color).
function signed(minutes: number): string {
  return minutes > 0 ? `+${formatMinutes(minutes)}` : formatMinutes(minutes);
}

type Props = { entries: BagLedgerEntry[]; isUncapped?: boolean };

export function BagLedgerTable({ entries, isUncapped = false }: Props) {
  const after = isUncapped ? "Usado" : "Saldo";
  return (
    <div className="kr-solid overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead className="hidden border-b text-left text-xs text-muted-foreground md:table-header-group">
          <tr>
            <th className="px-4 py-2.5 font-medium">Fecha</th>
            <th className="px-4 py-2.5 font-medium">Movimiento</th>
            <th className="px-4 py-2.5 text-right font-medium">Tiempo</th>
            <th className="px-4 py-2.5 text-right font-medium">{after}</th>
            <th className="px-4 py-2.5 font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-4 py-3 md:table-row md:px-0 md:py-0"
            >
              <td className="text-muted-foreground tabular-nums md:px-4 md:py-3 md:whitespace-nowrap">
                {dateTime.format(new Date(entry.createdAt))}
              </td>
              <td className="row-start-2 font-medium md:px-4 md:py-3">
                {MOVEMENT_LABELS[entry.kind]}
              </td>
              <td
                className={cn(
                  "text-right font-medium tabular-nums md:px-4 md:py-3 md:whitespace-nowrap",
                  entry.minutes > 0 ? "text-success" : "text-foreground",
                )}
              >
                {signed(entry.minutes)}
              </td>
              <td className="text-right text-muted-foreground tabular-nums md:px-4 md:py-3 md:whitespace-nowrap">
                <span className="md:hidden">{after.toLowerCase()} </span>
                {formatMinutes(
                  isUncapped ? 0 - entry.balanceAfter : entry.balanceAfter,
                )}
              </td>
              <td className="col-span-2 text-muted-foreground md:px-4 md:py-3">
                {entry.ticketNumber !== null && (
                  <span className="font-medium text-foreground">
                    Ticket #{entry.ticketNumber}
                    {entry.reason ? " · " : ""}
                  </span>
                )}
                {entry.reason}
                <span className="block text-xs">{entry.actorName}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
