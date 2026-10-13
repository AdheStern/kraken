// src/features/sales-control/components/lines/cv-note-row.tsx
// Fila de nota (kind = NOTA): texto sin importe que se exporta como fila de texto (AGENTS.md §2.1).
"use client";

import { TextCell } from "./grid-cells";
import { COLUMNS, type ColumnKey } from "./grid-columns";
import { RowActions, RowNumber } from "./row-parts";

type Props = {
  description: string;
  row: number;
  columns: ColumnKey[];
  canEdit: boolean;
  onChange: (description: string) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
};

export function CvNoteRow({
  description,
  row,
  columns,
  canEdit,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const span = columns.length - 2;
  const descriptionCol = columns.indexOf("description");

  return (
    <tr className="group/row border-b border-border/60 bg-muted/30 hover:bg-muted/50">
      <td className="px-0.5 py-0.5" style={{ width: COLUMNS.index.width }}>
        <RowNumber row={row} hasIssues={description.trim() === ""} />
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
        {canEdit && <RowActions onMove={onMove} onRemove={onRemove} />}
      </td>
    </tr>
  );
}
