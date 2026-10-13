// src/features/sales-control/components/leasing/cv-leasing-row.tsx
// Fila editable de la sección de leasing: proveedor, línea, código, descripción, cantidad y costo.
"use client";

import Decimal from "decimal.js";
import { Trash2 } from "lucide-react";
import { roundHalfUp2 } from "@/domain/pricing/money";
import { formatAmount } from "@/lib/format-amount";
import type { CvLeasingLineDraft } from "../../schemas/cv-leasing-schema";
import type { CvGridOptions } from "../../types";
import { NumberCell, SelectCell, TextCell } from "../lines/grid-cells";

const NUMBER = /^\d+(\.\d+)?$/;

export function leasingLineTotal(line: CvLeasingLineDraft): Decimal | null {
  if (
    !NUMBER.test(line.quantity.trim()) ||
    !NUMBER.test(line.unitCostUsd.trim())
  )
    return null;
  return roundHalfUp2(
    new Decimal(line.quantity.trim()).times(line.unitCostUsd.trim()),
  );
}

type Props = {
  line: CvLeasingLineDraft;
  row: number;
  options: CvGridOptions;
  canEdit: boolean;
  onChange: (patch: Partial<CvLeasingLineDraft>) => void;
  onRemove: () => void;
};

export function CvLeasingRow({
  line,
  row,
  options,
  canEdit,
  onChange,
  onRemove,
}: Props) {
  const disabled = !canEdit;
  return (
    <tr className="border-b border-border/60">
      <td className="w-40 p-0.5">
        <SelectCell
          row={row}
          col={0}
          label="Proveedor"
          value={line.supplierId}
          options={options.suppliers}
          disabled={disabled}
          onValueChange={(supplierId) => onChange({ supplierId })}
        />
      </td>
      <td className="w-32 p-0.5">
        <SelectCell
          row={row}
          col={1}
          label="Línea"
          value={line.technologyId}
          options={options.technologies}
          disabled={disabled}
          onValueChange={(technologyId) => onChange({ technologyId })}
        />
      </td>
      <td className="w-32 p-0.5">
        <TextCell
          row={row}
          col={2}
          label="Código"
          value={line.code}
          disabled={disabled}
          onChange={(e) => onChange({ code: e.target.value })}
        />
      </td>
      <td className="w-72 p-0.5">
        <TextCell
          row={row}
          col={3}
          label="Descripción"
          value={line.description}
          disabled={disabled}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </td>
      <td className="w-20 p-0.5">
        <NumberCell
          row={row}
          col={4}
          label="Cantidad"
          value={line.quantity}
          disabled={disabled}
          onValueChange={(quantity) => onChange({ quantity })}
        />
      </td>
      <td className="w-28 p-0.5">
        <NumberCell
          row={row}
          col={5}
          label="Costo unitario USD"
          value={line.unitCostUsd}
          disabled={disabled}
          onValueChange={(unitCostUsd) => onChange({ unitCostUsd })}
        />
      </td>
      <td className="w-28 px-2 text-right text-[13px] tabular-nums">
        {formatAmount(leasingLineTotal(line)?.toFixed(2) ?? "0")}
      </td>
      <td className="w-48 p-0.5">
        <TextCell
          row={row}
          col={7}
          label="Notas"
          value={line.notes}
          disabled={disabled}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </td>
      <td className="w-28 p-0.5">
        <TextCell
          row={row}
          col={8}
          label="PO#"
          value={line.poNumber}
          disabled={disabled}
          onChange={(e) => onChange({ poNumber: e.target.value })}
        />
      </td>
      <td className="w-10 p-0.5">
        {canEdit && (
          <button
            type="button"
            aria-label="Quitar línea de leasing"
            onClick={onRemove}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
