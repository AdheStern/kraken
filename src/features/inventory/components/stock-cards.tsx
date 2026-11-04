// src/features/inventory/components/stock-cards.tsx
// Stock de un almacén como tarjetas para tablet: en stock, reservado y disponible; el faltante se dice con texto
// («faltan 3»), nunca solo con color. Costo promedio y valor aparecen solo si llegaron (quien ve costos), y entonces
// la tarjeta abre el kardex (AGENTS.md §2.8, §2.9).
import Link from "next/link";
import { formatAmount } from "@/lib/format-amount";
import { cn } from "@/lib/utils";
import type { StockRow } from "../types";
import { formatQuantity } from "./inventory-labels";

type Props = { rows: StockRow[]; warehouseCode: string; showCosts: boolean };

export function StockCards({ rows, warehouseCode, showCosts }: Props) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
      {rows.map((row) => (
        <li key={row.productId}>
          {showCosts ? (
            <Link
              href={`/inventario/${warehouseCode}/${row.productId}`}
              className="kr-solid kr-lift block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <StockCard row={row} showCosts />
            </Link>
          ) : (
            <div className="kr-solid h-full rounded-xl">
              <StockCard row={row} showCosts={false} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function StockCard({ row, showCosts }: { row: StockRow; showCosts: boolean }) {
  const shortage = row.availableQuantity.startsWith("-");
  return (
    <div className="grid h-full content-start gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-semibold">
          {row.productCode}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {row.description}
        </p>
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 text-right tabular-nums">
        <Figure label="En stock" value={formatQuantity(row.quantity)} />
        <Figure
          label="Reservado"
          value={formatQuantity(row.reservedQuantity)}
        />
        <div>
          <dt className="text-xs text-muted-foreground">Disponible</dt>
          <dd
            className={cn(
              "text-xl font-semibold",
              shortage && "text-base text-warning",
            )}
          >
            {shortage
              ? `faltan ${formatQuantity(row.availableQuantity.slice(1))}`
              : formatQuantity(row.availableQuantity)}
          </dd>
        </div>
      </dl>
      {showCosts && (
        <dl className="grid grid-cols-2 gap-2 border-t pt-2 text-right text-sm tabular-nums">
          <div>
            <dt className="text-xs text-muted-foreground">Costo promedio</dt>
            <dd>
              {row.averageCostUsd ? formatAmount(row.averageCostUsd) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Valor USD</dt>
            <dd className="font-medium">{formatAmount(row.valueUsd ?? "0")}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
    </div>
  );
}
