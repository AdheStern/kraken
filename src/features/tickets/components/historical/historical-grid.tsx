// src/features/tickets/components/historical/historical-grid.tsx
// Grilla tipo planilla de la carga histórica: encabezado y columna # fijos con scroll propio, Enter y flechas como
// en Excel, pegar un bloque desde la celda enfocada y «Aplicar a todas» en las columnas desplegables (como la
// grilla del CV, AGENTS.md §5).
"use client";

import type { ClipboardEvent } from "react";
import { handleGridKeyDown } from "@/components/grid/grid-keyboard";
import { isBlockPaste } from "@/components/grid/is-block-paste";
import { parseTsv } from "@/domain/sales-control/parse-tsv";
import type { TicketFormOptions } from "../../queries/get-ticket-form-options";
import {
  HISTORICAL_COLUMNS,
  HISTORICAL_KEYS,
  type HistoricalKey,
  optionsFor,
} from "./historical-columns";
import { HistoricalFillPopover } from "./historical-fill-popover";
import { HistoricalRowCells, STICKY_INDEX } from "./historical-row-cells";
import type { DraftRow } from "./historical-rows";

const GRID_VIEWPORT =
  "max-h-[calc(100svh-14rem)] [&_[data-cell]]:scroll-mt-10 [&_[data-cell]]:scroll-ml-16";

type Props = {
  rows: DraftRow[];
  options: TicketFormOptions;
  errors: Map<string, string>;
  onCell: (index: number, key: HistoricalKey, value: string) => void;
  onRemove: (index: number) => void;
  onFill: (key: HistoricalKey, value: string, onlyEmpty: boolean) => void;
  onPasteBlock: (
    target: { row: number; col: number },
    matrix: string[][],
  ) => void;
};

export function HistoricalGrid({
  rows,
  options,
  errors,
  onCell,
  onRemove,
  onFill,
  onPasteBlock,
}: Props) {
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const element = event.target as HTMLElement;
    const text = event.clipboardData.getData("text/plain");
    if (!element.dataset.cell || !isBlockPaste(text, false)) return;
    event.preventDefault();
    const [row, col] = element.dataset.cell.split(":").map(Number);
    onPasteBlock({ row, col }, parseTsv(text));
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: delegación del teclado y del pegado de las celdas hijas.
    <div
      className={`kr-solid overflow-auto overscroll-contain rounded-xl ${GRID_VIEWPORT}`}
      onKeyDown={handleGridKeyDown}
      onPaste={handlePaste}
    >
      <table className="w-max min-w-full border-separate border-spacing-0 text-[13px]">
        <colgroup>
          <col style={{ width: 44 }} />
          {HISTORICAL_KEYS.map((key) => (
            <col key={key} style={{ width: HISTORICAL_COLUMNS[key].width }} />
          ))}
          <col style={{ width: 36 }} />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b">
            <th
              scope="col"
              className={`${STICKY_INDEX} px-2 py-2 text-xs font-medium text-muted-foreground`}
            >
              #
            </th>
            {HISTORICAL_KEYS.map((key) => (
              <th
                key={key}
                scope="col"
                className="px-2.5 py-2 text-left text-xs font-medium whitespace-nowrap text-muted-foreground"
              >
                {HISTORICAL_COLUMNS[key].kind === "select" ? (
                  <HistoricalFillPopover
                    label={HISTORICAL_COLUMNS[key].label}
                    options={optionsFor(key, options)}
                    onApply={(value, onlyEmpty) =>
                      onFill(key, value, onlyEmpty)
                    }
                  />
                ) : (
                  HISTORICAL_COLUMNS[key].label
                )}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <HistoricalRowCells
              key={row.key}
              row={row}
              index={index}
              options={options}
              errors={errors}
              onChange={(key, value) => onCell(index, key, value)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
