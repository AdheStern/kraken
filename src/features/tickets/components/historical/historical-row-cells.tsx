// src/features/tickets/components/historical/historical-row-cells.tsx
// Una fila de la carga histórica: número, una celda por columna (texto, fecha, hora o selector con las opciones
// que dependen de la fila) con su error de validación, y quitar la fila.
"use client";

import { X } from "lucide-react";
import { SelectCell, TextCell } from "@/components/grid/grid-cells";
import { Button } from "@/components/ui/button";
import type { TicketFormOptions } from "../../queries/get-ticket-form-options";
import {
  cellValue,
  HISTORICAL_COLUMNS,
  HISTORICAL_KEYS,
  type HistoricalKey,
  optionsFor,
} from "./historical-columns";
import type { DraftRow } from "./historical-rows";

export const STICKY_INDEX =
  "sticky left-0 z-[1] bg-card bg-clip-padding shadow-[1px_0_0_var(--border)]";

type Props = {
  row: DraftRow;
  index: number;
  options: TicketFormOptions;
  errors: Map<string, string>;
  onChange: (key: HistoricalKey, value: string) => void;
  onRemove: () => void;
};

export function HistoricalRowCells({
  row,
  index,
  options,
  errors,
  onChange,
  onRemove,
}: Props) {
  return (
    <tr className="border-b border-border/60 hover:bg-muted/30">
      <td
        className={`${STICKY_INDEX} px-2 text-right text-xs text-muted-foreground tabular-nums`}
      >
        {index + 1}
      </td>
      {HISTORICAL_KEYS.map((key, col) => {
        const column = HISTORICAL_COLUMNS[key];
        const common = {
          row: index,
          col,
          label: `${column.label}, fila ${index + 1}`,
          error: errors.get(`${index}:${key}`),
        };
        return (
          <td key={key} className="px-0.5 py-0.5">
            {column.kind === "select" ? (
              <SelectCell
                {...common}
                value={cellValue(row, key) || null}
                options={optionsFor(key, options, row)}
                onValueChange={(value) => onChange(key, value ?? "")}
              />
            ) : (
              <TextCell
                {...common}
                value={cellValue(row, key)}
                placeholder={column.placeholder}
                inputMode={column.kind === "text" ? undefined : "numeric"}
                onChange={(event) => onChange(key, event.target.value)}
              />
            )}
          </td>
        );
      })}
      <td className="px-1">
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={`Quitar la fila ${index + 1}`}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}
