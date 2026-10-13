// src/features/sales-control/components/lines/item-pricing-cells.tsx
// Celdas de precio de una fila de ítem: costo, factor ↔ venta y totales en vivo.
// Escribir el factor fija el modo FACTOR; escribir la venta fija el modo PRECIO (AGENTS.md §2.2).
"use client";

import type { ReactNode } from "react";
import { formatAmount } from "@/lib/format-amount";
import { NumberCell } from "./grid-cells";
import type { ColumnKey } from "./grid-columns";
import type { ItemCellContext } from "./item-cell-context";
import { PricingBadge } from "./pricing-badge";

const ZERO = /^0*(\.0*)?$/;

export function pricingCells({
  line,
  row,
  col,
  issue,
  priced,
  disabled,
  onChange,
}: ItemCellContext): Partial<Record<ColumnKey, ReactNode>> {
  const cost = line.unitCostUsd.trim();
  // REGLA: con costo 0 solo existe el modo PRECIO; el factor queda vacío (§2.2, PRECIO-01 L3).
  const isZeroCost = cost !== "" && ZERO.test(cost);
  const isFactorSource = line.pricingSource === "FACTOR" && !isZeroCost;
  const factorValue = isZeroCost
    ? ""
    : isFactorSource
      ? line.factor
      : (priced?.pricing.factor?.toFixed(2) ?? "");
  const saleValue = isFactorSource
    ? (priced?.pricing.unitSaleUsd.toFixed(2) ?? "")
    : line.unitSaleUsd;

  return {
    unitCost: (
      <NumberCell
        row={row}
        col={col("unitCost")}
        label="Costo unitario USD"
        value={line.unitCostUsd}
        error={issue("unitCostUsd")}
        disabled={disabled}
        onValueChange={(unitCostUsd) => onChange({ unitCostUsd })}
      />
    ),
    factor: (
      <div className="flex items-center gap-1">
        <PricingBadge
          source={line.pricingSource}
          pricing={priced?.pricing ?? null}
        />
        <NumberCell
          row={row}
          col={col("factor")}
          label="Factor"
          value={factorValue}
          muted={!isFactorSource}
          allowThousands={false}
          error={issue("factor")}
          disabled={disabled || isZeroCost}
          onValueChange={(factor) =>
            onChange({ pricingSource: "FACTOR", factor })
          }
        />
      </div>
    ),
    unitSale: (
      <NumberCell
        row={row}
        col={col("unitSale")}
        label="Venta unitaria USD"
        value={saleValue}
        muted={isFactorSource}
        error={issue("unitSaleUsd")}
        disabled={disabled}
        onValueChange={(unitSaleUsd) =>
          onChange({ pricingSource: "PRECIO", unitSaleUsd })
        }
      />
    ),
    totalCost: <Amount value={priced?.totals.totalCostUsd.toFixed(2)} />,
    totalSale: <Amount value={priced?.totals.totalSaleUsd.toFixed(2)} strong />,
  };
}

function Amount({ value, strong }: { value?: string; strong?: boolean }) {
  return (
    <span
      className={`block px-2 text-right text-[13px] tabular-nums ${strong ? "font-medium" : "text-muted-foreground"}`}
    >
      {value ? formatAmount(value) : "—"}
    </span>
  );
}
