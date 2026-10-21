// src/features/inventory/components/kardex-table.tsx
// Kardex de un producto en un almacén: cada movimiento con signo explícito, costo, saldo tras la línea y el
// documento de origen (AGENTS.md §2.8). Mismo lenguaje que el libro de la bolsa.
import Link from "next/link";
import { formatAmount } from "@/lib/format-amount";
import { cn } from "@/lib/utils";
import type { KardexEntry } from "../types";
import {
  formatQuantity,
  MOVEMENT_KIND_LABELS,
  RECEIPT_ORIGIN_LABELS,
} from "./inventory-labels";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

// POR QUÉ: el signo va escrito (+/−); el color solo acompaña (WCAG: nunca solo color).
function signed(value: string): string {
  return value.startsWith("-")
    ? `−${formatQuantity(value.slice(1))}`
    : `+${formatQuantity(value)}`;
}

export function KardexTable({ entries }: { entries: KardexEntry[] }) {
  return (
    <div className="kr-solid overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead className="hidden border-b text-left text-xs text-muted-foreground md:table-header-group">
          <tr>
            <th className="px-4 py-2.5 font-medium">Fecha</th>
            <th className="px-4 py-2.5 font-medium">Movimiento</th>
            <th className="px-4 py-2.5 text-right font-medium">Cantidad</th>
            <th className="px-4 py-2.5 text-right font-medium">Costo unit.</th>
            <th className="px-4 py-2.5 text-right font-medium">Saldo</th>
            <th className="px-4 py-2.5 text-right font-medium">
              Valor del saldo
            </th>
            <th className="px-4 py-2.5 font-medium">Origen</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((entry) => {
            const isIn = !entry.quantity.startsWith("-");
            return (
              <tr
                key={entry.lineId}
                className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-4 py-3 md:table-row md:px-0 md:py-0"
              >
                <td className="text-muted-foreground tabular-nums md:px-4 md:py-3 md:whitespace-nowrap">
                  {dateTime.format(new Date(entry.createdAt))}
                </td>
                <td className="font-medium max-md:order-3 md:px-4 md:py-3">
                  {MOVEMENT_KIND_LABELS[entry.movementKind]}
                  {entry.receiptOrigin && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {RECEIPT_ORIGIN_LABELS[entry.receiptOrigin]}
                    </span>
                  )}
                  <span className="block text-xs font-normal text-muted-foreground tabular-nums">
                    N.º {entry.movementNumber}
                    {entry.serial ? ` · serial ${entry.serial}` : ""}
                  </span>
                </td>
                <td
                  className={cn(
                    "text-right font-medium tabular-nums max-md:order-2 md:px-4 md:py-3",
                    isIn ? "text-success" : "text-foreground",
                  )}
                >
                  {signed(entry.quantity)}
                </td>
                <td className="text-right text-muted-foreground tabular-nums max-md:order-4 md:px-4 md:py-3 md:whitespace-nowrap">
                  <span className="md:hidden">a </span>
                  {formatAmount(entry.unitCostUsd)}
                </td>
                <td className="text-right tabular-nums max-md:order-5 md:px-4 md:py-3 md:whitespace-nowrap">
                  <span className="text-muted-foreground md:hidden">
                    saldo{" "}
                  </span>
                  {formatQuantity(entry.balanceQuantity)}
                </td>
                <td className="text-right text-muted-foreground tabular-nums max-md:order-6 md:px-4 md:py-3 md:whitespace-nowrap">
                  <span className="md:hidden">USD </span>
                  {formatAmount(entry.balanceValueUsd)}
                </td>
                <td className="col-span-2 text-muted-foreground max-md:order-7 md:px-4 md:py-3">
                  <Origin entry={entry} />
                  <span className="block text-xs">{entry.actorName}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Origin({ entry }: { entry: KardexEntry }) {
  const { document, notes } = entry;
  const link =
    document && "href" in document ? (
      <Link
        href={document.href}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {document.label}
      </Link>
    ) : (
      document && (
        <span className="font-medium text-foreground">{document.label}</span>
      )
    );
  return (
    <>
      {link}
      {link && notes ? " · " : ""}
      {notes}
    </>
  );
}
