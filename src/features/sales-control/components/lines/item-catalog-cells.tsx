// src/features/sales-control/components/lines/item-catalog-cells.tsx
// Celdas descriptivas de una fila de ítem: área, producto, descripción, unidad, cantidad y clasificación.
"use client";

import type { ReactNode } from "react";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { NumberCell, SelectCell, TextAreaCell, TextCell } from "./grid-cells";
import {
  type ColumnKey,
  ITEM_TYPE_OPTIONS,
  SUPPLY_MODE_OPTIONS,
} from "./grid-columns";
import type { ItemCellContext } from "./item-cell-context";

export function catalogCells(
  { line, row, col, issue, disabled, onChange }: ItemCellContext,
  options: CvGridOptions,
  onProductCode: (code: string) => void,
): Partial<Record<ColumnKey, ReactNode>> {
  const select = (
    key: ColumnKey,
    label: string,
    value: string | null,
    items: { id: string; label: string }[],
    patch: (value: string | null) => Partial<CvLineDraft>,
    error?: string,
  ) => (
    <SelectCell
      row={row}
      col={col(key)}
      label={label}
      value={value}
      options={items}
      error={error}
      disabled={disabled}
      onValueChange={(next) => onChange(patch(next))}
    />
  );
  const text = (
    key: ColumnKey,
    label: string,
    value: string,
    patch: (value: string) => Partial<CvLineDraft>,
    error?: string,
  ) => (
    <TextCell
      row={row}
      col={col(key)}
      label={label}
      value={value}
      error={error}
      disabled={disabled}
      onChange={(event) => onChange(patch(event.target.value))}
    />
  );

  return {
    area: select(
      "area",
      "Área",
      line.areaId,
      options.areas,
      (areaId) => ({ areaId }),
      issue("areaId"),
    ),
    code: (
      <TextCell
        row={row}
        col={col("code")}
        label="Código"
        list="cv-product-codes"
        value={line.code}
        disabled={disabled}
        onChange={(event) => onProductCode(event.target.value)}
      />
    ),
    description: text(
      "description",
      "Descripción",
      line.description,
      (description) => ({ description }),
      issue("description"),
    ),
    unit: select("unit", "Unidad", line.unitId, options.units, (unitId) => ({
      unitId,
    })),
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
    supplier: select(
      "supplier",
      "Proveedor",
      line.supplierId,
      options.suppliers,
      (supplierId) => ({ supplierId }),
    ),
    supplyMode: select(
      "supplyMode",
      "Modalidad",
      line.supplyMode,
      SUPPLY_MODE_OPTIONS,
      (value) => ({ supplyMode: value as CvLineDraft["supplyMode"] }),
    ),
    technology: select(
      "technology",
      "Tecnología",
      line.technologyId,
      options.technologies,
      (technologyId) => ({ technologyId }),
    ),
    itemType: select(
      "itemType",
      "Tipo",
      line.itemType,
      ITEM_TYPE_OPTIONS,
      (value) => ({ itemType: value as CvLineDraft["itemType"] }),
    ),
    poNumber: text("poNumber", "PO#", line.poNumber, (poNumber) => ({
      poNumber,
    })),
    notes: (
      <TextAreaCell
        row={row}
        col={col("notes")}
        label="Observaciones"
        value={line.notes}
        disabled={disabled}
        onValueChange={(notes) => onChange({ notes })}
      />
    ),
  };
}
