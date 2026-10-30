// src/features/sales-control/components/lines/cv-line-grid.tsx
// Grilla tipo planilla de las líneas del CV: secciones por lote, ítems, notas y navegación con teclado.
"use client";

import Decimal from "decimal.js";
import type { ClipboardEvent, Dispatch } from "react";
import { parseTsv } from "@/domain/sales-control/parse-tsv";
import type { PriceLineResult } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { CvGroupRow } from "./cv-group-row";
import { CvItemRow } from "./cv-item-row";
import { CvNoteRow } from "./cv-note-row";
import type { ColumnKey } from "./grid-columns";
import { GridHeader } from "./grid-header";
import { handleGridKeyDown } from "./grid-keyboard";
import type { LinesAction, LinesState } from "./use-cv-lines-state";
import type { LineDetailInfo } from "./use-lines-pricing";

type Props = {
  state: LinesState;
  results: Map<string, PriceLineResult>;
  columns: ColumnKey[];
  options: CvGridOptions;
  canEdit: boolean;
  dispatch: Dispatch<LinesAction>;
  details: Map<string, LineDetailInfo>;
  onOpenDetail: (lineKey: string) => void;
  onPasteBlock: (
    target: { lineKey: string; column: ColumnKey },
    matrix: string[][],
  ) => void;
  onApplyGroupFactor: (groupKey: string, factor: string) => void;
};

export function CvLineGrid({
  state,
  results,
  columns,
  options,
  canEdit,
  dispatch,
  details,
  onOpenDetail,
  onPasteBlock,
  onApplyGroupFactor,
}: Props) {
  const rowOf = new Map(state.lines.map((line, index) => [line.key, index]));
  const sections = [null, ...state.groups.map((group) => group.key)];
  const productsByCode = new Map(
    options.products.map((product) => [product.code.toUpperCase(), product]),
  );

  // POR QUÉ: un bloque con tabuladores o saltos se reparte en celdas como en Excel; un valor suelto se pega normal.
  // En un texto largo los saltos son parte del texto: solo un bloque con tabuladores se reparte.
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const cell = target.dataset.cell;
    const text = event.clipboardData.getData("text/plain");
    const block = target instanceof HTMLTextAreaElement ? /\t/ : /[\t\n]/;
    if (!canEdit || !cell || !block.test(text.trimEnd())) return;
    const [row, col] = cell.split(":").map(Number);
    const line = state.lines[row];
    const column = columns[col];
    if (!line || !column) return;
    event.preventDefault();
    onPasteBlock({ lineKey: line.key, column }, parseTsv(text));
  }

  function renderLine(line: CvLineDraft) {
    const row = rowOf.get(line.key) ?? 0;
    const common = {
      row,
      columns,
      canEdit,
      onMove: (offset: -1 | 1) =>
        dispatch({ type: "moveLine", key: line.key, offset }),
      onRemove: () => dispatch({ type: "removeLine", key: line.key }),
    };
    if (line.kind === "NOTA") {
      return (
        <CvNoteRow
          key={line.key}
          {...common}
          description={line.description}
          onChange={(description) =>
            dispatch({
              type: "updateLine",
              key: line.key,
              patch: { description },
            })
          }
        />
      );
    }
    return (
      <CvItemRow
        key={line.key}
        {...common}
        line={line}
        options={options}
        result={results.get(line.key) ?? { ok: false, issues: [] }}
        detailState={details.get(line.key)?.state ?? "empty"}
        onDetail={() => onOpenDetail(line.key)}
        onChange={(patch) =>
          dispatch({ type: "updateLine", key: line.key, patch })
        }
        onProductCode={(code) => {
          dispatch({
            type: "updateLine",
            key: line.key,
            patch: { code, productId: null },
          });
          const product = productsByCode.get(code.trim().toUpperCase());
          if (product)
            dispatch({ type: "applyProduct", key: line.key, product });
        }}
      />
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: delegación del teclado de las celdas (inputs y selects) hijas.
    <div
      className="kr-solid overflow-x-auto rounded-xl"
      onKeyDown={handleGridKeyDown}
      onPaste={handlePaste}
    >
      <table className="w-max min-w-full border-collapse text-left">
        <GridHeader columns={columns} />
        <tbody>
          {sections.map((groupKey) => {
            const group = state.groups.find((g) => g.key === groupKey);
            const lines = state.lines.filter(
              (line) => line.groupKey === groupKey,
            );
            return [
              group && (
                <CvGroupRow
                  key={`group-${group.key}`}
                  name={group.name}
                  span={columns.length}
                  canEdit={canEdit}
                  lineCount={lines.length}
                  subtotalSaleUsd={subtotal(lines, results)}
                  onRename={(name) =>
                    dispatch({ type: "renameGroup", key: group.key, name })
                  }
                  onAddLine={() =>
                    dispatch({
                      type: "addLine",
                      groupKey: group.key,
                      kind: "ITEM",
                    })
                  }
                  onAddNote={() =>
                    dispatch({
                      type: "addLine",
                      groupKey: group.key,
                      kind: "NOTA",
                    })
                  }
                  onRemove={() =>
                    dispatch({ type: "removeGroup", key: group.key })
                  }
                  onApplyFactor={(factor) =>
                    onApplyGroupFactor(group.key, factor)
                  }
                />
              ),
              ...lines.map(renderLine),
            ];
          })}
        </tbody>
      </table>
      <datalist id="cv-product-codes">
        {options.products.map((product) => (
          <option key={product.id} value={product.code}>
            {product.description}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function subtotal(
  lines: CvLineDraft[],
  results: Map<string, PriceLineResult>,
): string {
  return lines
    .reduce((sum, line) => {
      const result = results.get(line.key);
      return result?.ok ? sum.plus(result.value.totals.totalSaleUsd) : sum;
    }, new Decimal(0))
    .toFixed(2);
}
