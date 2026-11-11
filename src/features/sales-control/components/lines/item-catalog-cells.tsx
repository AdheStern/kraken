// src/features/sales-control/components/lines/item-catalog-cells.tsx
// Celdas descriptivas de una fila de ítem: área, producto, descripción, unidad, cantidad, clasificación, BC, PO#,
// rango de activación (licencias) y observaciones.
"use client";

import type { ReactNode } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { CvGridOptions } from "../../types";
import {
  CELL_INPUT,
  NumberCell,
  SelectCell,
  TextAreaCell,
  TextCell,
} from "./grid-cells";
import type { ColumnKey } from "./grid-columns";
import type { ItemCellContext } from "./item-cell-context";
import { SELECT_COLUMNS, type SelectColumnKey } from "./select-columns";

export function catalogCells(
  {
    line,
    row,
    col,
    issue,
    disabled,
    postSaleDisabled,
    onChange,
  }: ItemCellContext,
  options: CvGridOptions,
  onProductCode: (code: string) => void,
): Partial<Record<ColumnKey, ReactNode>> {
  const select = (key: SelectColumnKey, label: string, error?: string) => {
    const { field, items, patch } = SELECT_COLUMNS[key];
    return (
      <SelectCell
        row={row}
        col={col(key)}
        label={label}
        value={line[field] as string | null}
        options={items(options)}
        error={error}
        disabled={disabled}
        onValueChange={(next) => onChange(patch(next))}
      />
    );
  };
  return {
    area: select("area", "Área", issue("areaId")),
    code: (
      <TextCell
        row={row}
        col={col("code")}
        label="Código"
        list="cv-product-codes"
        value={line.code}
        // POR QUÉ: size es el respaldo donde el navegador no tiene field-sizing.
        size={Math.max(line.code.length, 1) + 1}
        disabled={disabled}
        onChange={(event) => onProductCode(event.target.value)}
      />
    ),
    description: (
      <TextAreaCell
        row={row}
        col={col("description")}
        label="Descripción"
        value={line.description}
        error={issue("description")}
        disabled={disabled}
        onValueChange={(description) => onChange({ description })}
      />
    ),
    unit: select("unit", "Unidad"),
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
    supplier: select("supplier", "Proveedor"),
    supplyMode: select("supplyMode", "Modalidad"),
    technology: select("technology", "Tecnología"),
    itemType: select("itemType", "Tipo"),
    bc: (
      <TextCell
        row={row}
        col={col("bc")}
        label="BC"
        value={line.bc}
        disabled={postSaleDisabled}
        onChange={(event) => onChange({ bc: event.target.value })}
      />
    ),
    poNumber: (
      <TextCell
        row={row}
        col={col("poNumber")}
        label="PO#"
        value={line.poNumber}
        disabled={postSaleDisabled}
        onChange={(event) => onChange({ poNumber: event.target.value })}
      />
    ),
    activation: (
      <DateRangePicker
        data-cell={`${row}:${col("activation")}`}
        aria-label="Rango de activación"
        start={line.activationStart}
        end={line.activationEnd}
        disabled={postSaleDisabled || line.itemType !== "INTANGIBLE"}
        placeholder={
          line.itemType === "INTANGIBLE" ? "Elige el rango" : "Solo intangibles"
        }
        onChange={(activationStart, activationEnd) =>
          onChange({ activationStart, activationEnd })
        }
        className={`h-8 rounded-[6px] border-transparent hover:border-border dark:bg-transparent ${CELL_INPUT}`}
      />
    ),
    notes: (
      <TextAreaCell
        row={row}
        col={col("notes")}
        label="Observaciones"
        value={line.notes}
        disabled={postSaleDisabled}
        onValueChange={(notes) => onChange({ notes })}
      />
    ),
  };
}
