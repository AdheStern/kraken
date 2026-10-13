// src/features/sales-control/components/lines/cv-item-row.tsx
// Fila de ítem de la grilla: catálogos, cantidad, costo, factor ↔ precio y totales en vivo.
// Escribir el factor fija el modo FACTOR; escribir la venta fija el modo PRECIO (AGENTS.md §2.2).
"use client";

import type { ReactNode } from "react";
import { formatAmount } from "@/lib/format-amount";
import type { PriceLineResult } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { NumberCell, SelectCell, TextCell } from "./grid-cells";
import {
  type ColumnKey,
  ITEM_TYPE_OPTIONS,
  SUPPLY_MODE_OPTIONS,
} from "./grid-columns";
import { PricingBadge } from "./pricing-badge";
import { RowActions, RowNumber } from "./row-parts";

type Props = {
  line: CvLineDraft;
  row: number;
  result: PriceLineResult;
  columns: ColumnKey[];
  options: CvGridOptions;
  canEdit: boolean;
  onChange: (patch: Partial<CvLineDraft>) => void;
  onProductCode: (code: string) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
};

export function CvItemRow({
  line,
  row,
  result,
  columns,
  options,
  canEdit,
  onChange,
  onProductCode,
  onMove,
  onRemove,
}: Props) {
  const priced = result.ok ? result.value : null;
  const issue = (field: keyof CvLineDraft) =>
    result.ok
      ? undefined
      : result.issues.find((i) => i.field === field)?.message;
  const isZeroCost =
    /^0*(\.0*)?$/.test(line.unitCostUsd.trim()) &&
    line.unitCostUsd.trim() !== "";
  const col = (key: ColumnKey) => columns.indexOf(key);
  const disabled = !canEdit;

  const cells: Record<ColumnKey, ReactNode> = {
    index: <RowNumber row={row} hasIssues={!result.ok} />,
    area: (
      <SelectCell
        row={row}
        col={col("area")}
        label="Área"
        value={line.areaId}
        options={options.areas}
        error={issue("areaId")}
        disabled={disabled}
        onValueChange={(areaId) => onChange({ areaId })}
      />
    ),
    supplier: (
      <SelectCell
        row={row}
        col={col("supplier")}
        label="Proveedor"
        value={line.supplierId}
        options={options.suppliers}
        disabled={disabled}
        onValueChange={(supplierId) => onChange({ supplierId })}
      />
    ),
    supplyMode: (
      <SelectCell
        row={row}
        col={col("supplyMode")}
        label="Modalidad"
        value={line.supplyMode}
        options={SUPPLY_MODE_OPTIONS}
        disabled={disabled}
        onValueChange={(v) =>
          onChange({ supplyMode: v as CvLineDraft["supplyMode"] })
        }
      />
    ),
    technology: (
      <SelectCell
        row={row}
        col={col("technology")}
        label="Tecnología"
        value={line.technologyId}
        options={options.technologies}
        disabled={disabled}
        onValueChange={(technologyId) => onChange({ technologyId })}
      />
    ),
    itemType: (
      <SelectCell
        row={row}
        col={col("itemType")}
        label="Tipo"
        value={line.itemType}
        options={ITEM_TYPE_OPTIONS}
        disabled={disabled}
        onValueChange={(v) =>
          onChange({ itemType: v as CvLineDraft["itemType"] })
        }
      />
    ),
    code: (
      <TextCell
        row={row}
        col={col("code")}
        label="Código"
        list="cv-product-codes"
        value={line.code}
        disabled={disabled}
        onChange={(e) => onProductCode(e.target.value)}
      />
    ),
    description: (
      <TextCell
        row={row}
        col={col("description")}
        label="Descripción"
        value={line.description}
        error={issue("description")}
        disabled={disabled}
        onChange={(e) => onChange({ description: e.target.value })}
      />
    ),
    unit: (
      <SelectCell
        row={row}
        col={col("unit")}
        label="Unidad"
        value={line.unitId}
        options={options.units}
        disabled={disabled}
        onValueChange={(unitId) => onChange({ unitId })}
      />
    ),
    quantity: (
      <NumberCell
        row={row}
        col={col("quantity")}
        label="Cantidad"
        value={line.quantity}
        error={issue("quantity")}
        disabled={disabled}
        onValueChange={(quantity) => onChange({ quantity })}
      />
    ),
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
          error={issue("factor")}
          disabled={disabled || isZeroCost}
          value={
            isZeroCost
              ? ""
              : line.pricingSource === "FACTOR"
                ? line.factor
                : (priced?.pricing.factor?.toFixed(2) ?? "")
          }
          muted={line.pricingSource !== "FACTOR"}
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
        error={issue("unitSaleUsd")}
        disabled={disabled}
        value={
          line.pricingSource === "PRECIO" || isZeroCost
            ? line.unitSaleUsd
            : (priced?.pricing.unitSaleUsd.toFixed(2) ?? "")
        }
        muted={line.pricingSource !== "PRECIO" && !isZeroCost}
        onValueChange={(unitSaleUsd) =>
          onChange({ pricingSource: "PRECIO", unitSaleUsd })
        }
      />
    ),
    totalCost: <Amount value={priced?.totals.totalCostUsd.toFixed(2)} />,
    totalSale: <Amount value={priced?.totals.totalSaleUsd.toFixed(2)} strong />,
    poNumber: (
      <TextCell
        row={row}
        col={col("poNumber")}
        label="PO#"
        value={line.poNumber}
        disabled={disabled}
        onChange={(e) => onChange({ poNumber: e.target.value })}
      />
    ),
    notes: (
      <TextCell
        row={row}
        col={col("notes")}
        label="Observaciones"
        value={line.notes}
        disabled={disabled}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    ),
    actions: canEdit ? (
      <RowActions onMove={onMove} onRemove={onRemove} />
    ) : null,
  };

  return (
    <tr className="group/row border-b border-border/60 hover:bg-muted/40">
      {columns.map((key) => (
        <td key={key} className="px-0.5 py-0.5 align-middle">
          {cells[key]}
        </td>
      ))}
    </tr>
  );
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
