// src/features/sales-control/components/lines/cv-note-row.tsx
// Fila de nota (kind = NOTA): texto sin importe que se exporta como fila de texto (AGENTS.md §2.1).
"use client";

import { rowColorStyle } from "./excel-palette";
import { TextCell } from "./grid-cells";
import { COLUMNS, type ColumnKey } from "./grid-columns";
import { RowColorPicker } from "./row-color-picker";
import { RowActions, RowNumber } from "./row-parts";

type Props = {
  description: string;
  row: number;
  label: string | null;
  isOrphan: boolean;
  columns: ColumnKey[];
  canEdit: boolean;
  onChange: (description: string) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  color: string | null;
  onColor: (color: string | null) => void;
};

export function CvNoteRow({
  description,
  row,
  columns,
  canEdit,
  onChange,
  onMove,
  onRemove,
  color,
  onColor,
}: Props) {
  const span = columns.length - 2;
  const descriptionCol = columns.indexOf("description");

  return (
    <tr
      className="group/row border-b border-border/60 bg-muted/30 hover:bg-muted/50"
      style={rowColorStyle(color)}
    >
      <td className="px-0.5 py-0.5" style={{ width: COLUMNS.index.width }}>
        <RowNumber label={null} hasIssues={description.trim() === ""} />
      </td>
      <td colSpan={span} className="px-0.5 py-0.5">
        <TextCell
          row={row}
          col={descriptionCol}
          label="Nota"
          value={description}
          placeholder="Nota: p. ej. Initial Term - 36 Months"
          disabled={!canEdit}
          onChange={(event) => onChange(event.target.value)}
          className="italic"
        />
      </td>
      <td className="px-0.5 py-0.5">
        {canEdit && (
          <div className="flex items-center justify-end">
            <RowColorPicker value={color} onChange={onColor} />
            <RowActions onMove={onMove} onRemove={onRemove} />
          </div>
        )}
      </td>
    </tr>
  );
}
