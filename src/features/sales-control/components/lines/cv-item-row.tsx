// src/features/sales-control/components/lines/cv-item-row.tsx
// Fila de ítem de la grilla: arma las celdas descriptivas y de precio en el orden de las columnas visibles.
"use client";

import type { PriceLineResult } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import type { ColumnKey } from "./grid-columns";
import { catalogCells } from "./item-catalog-cells";
import type { ItemCellContext } from "./item-cell-context";
import { pricingCells } from "./item-pricing-cells";
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
  const context: ItemCellContext = {
    line,
    row,
    col: (key) => columns.indexOf(key),
    issue: (field) =>
      result.ok
        ? undefined
        : result.issues.find((i) => i.field === field)?.message,
    priced: result.ok ? result.value : null,
    disabled: !canEdit,
    onChange,
  };
  const cells = {
    index: <RowNumber row={row} hasIssues={!result.ok} />,
    ...catalogCells(context, options, onProductCode),
    ...pricingCells(context),
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
