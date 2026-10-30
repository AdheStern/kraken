// src/features/sales-control/components/lines/cv-item-row.tsx
// Fila de ítem de la grilla: arma las celdas descriptivas y de precio en el orden de las columnas visibles.
"use client";

import type { PriceLineResult } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { rowColorStyle } from "./excel-palette";
import type { ColumnKey } from "./grid-columns";
import { catalogCells } from "./item-catalog-cells";
import type { ItemCellContext } from "./item-cell-context";
import { pricingCells } from "./item-pricing-cells";
import { RowColorPicker } from "./row-color-picker";
import { DetailButton, RowActions, RowNumber } from "./row-parts";

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
  color: string | null;
  onColor: (color: string | null) => void;
  detailState: "empty" | "filled" | "issues";
  onDetail: () => void;
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
  color,
  onColor,
  detailState,
  onDetail,
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
    index: (
      <RowNumber row={row} hasIssues={!result.ok || detailState === "issues"} />
    ),
    ...catalogCells(context, options, onProductCode),
    ...pricingCells(context),
    actions: (
      <div className="flex items-center justify-end">
        <DetailButton state={detailState} onClick={onDetail} />
        {canEdit && <RowColorPicker value={color} onChange={onColor} />}
        {canEdit && <RowActions onMove={onMove} onRemove={onRemove} />}
      </div>
    ),
  };

  return (
    <tr
      className="group/row border-b border-border/60 hover:bg-muted/40"
      style={rowColorStyle(color)}
    >
      {columns.map((key) => (
        <td key={key} className="px-0.5 py-0.5 align-middle">
          {cells[key]}
        </td>
      ))}
    </tr>
  );
}
