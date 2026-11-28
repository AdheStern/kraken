// src/features/sales-control/components/lines/stock-cost-badge.tsx
// Marca junto al costo de una línea «Stock DIMA»: dice si el costo es el promedio del inventario de la ciudad
// del CV o, si el comercial lo cambió, cuánto vale ese promedio (decisión 2026-11-28).
import Decimal from "decimal.js";
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";
import { formatAmount } from "@/lib/format-amount";

export function StockCostBadge({
  cost,
  stockCostUsd,
}: {
  cost: string;
  stockCostUsd: string;
}) {
  const typed = parseDecimalText(cost);
  const isStockCost =
    typed !== null && new Decimal(typed).equals(new Decimal(stockCostUsd));
  const title = isStockCost
    ? "Costo promedio del inventario en el almacén de la ciudad del CV. Puedes cambiarlo."
    : `El costo promedio del inventario en la ciudad del CV es ${formatAmount(stockCostUsd)} USD.`;

  return (
    <span
      role="img"
      title={title}
      aria-label={title}
      className={`flex h-5 shrink-0 items-center justify-center rounded px-1 text-[10px] font-semibold ${
        isStockCost
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      INV
    </span>
  );
}
