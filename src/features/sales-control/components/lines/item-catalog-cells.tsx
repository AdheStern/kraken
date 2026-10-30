// src/features/sales-control/components/lines/item-catalog-cells.tsx
// Celdas descriptivas de una fila de ítem: área, producto, descripción, unidad, cantidad, clasificación, rango de
// activación (licencias) y observaciones.
"use client";

import type { ReactNode } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
        // POR QUÉ: el código se lee entero; la celda mide su texto (mínimo el ancho de la columna) y la tabla, que
        // se ajusta al contenido, se ensancha. size es el respaldo donde no hay field-sizing.
        size={Math.max(line.code.length, 1) + 1}
        className="w-auto min-w-full field-sizing-content"
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
      // REGLA: el rango de activación es solo de licencias; deja de valer si la línea cambia de tipo (§2.1).
      (value) => ({
        itemType: value as CvLineDraft["itemType"],
        ...(value !== "INTANGIBLE" && {
          activationStart: "",
          activationEnd: "",
        }),
      }),
    ),
    poNumber: text("poNumber", "PO#", line.poNumber, (poNumber) => ({
      poNumber,
    })),
    activation: (
      <DateRangePicker
        data-cell={`${row}:${col("activation")}`}
        aria-label="Rango de activación"
        start={line.activationStart}
        end={line.activationEnd}
        disabled={disabled || line.itemType !== "INTANGIBLE"}
        placeholder={
          line.itemType === "INTANGIBLE" ? "Elige el rango" : "Solo intangibles"
        }
        onChange={(activationStart, activationEnd) =>
          onChange({ activationStart, activationEnd })
        }
        className="h-8 rounded-[6px] border-transparent px-2 text-[13px] hover:border-border focus-visible:border-ring dark:bg-transparent"
      />
    ),
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
