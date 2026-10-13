// src/features/sales-control/components/lines/cv-line-grid.tsx
// Grilla tipo planilla de las líneas del CV: secciones por lote, ítems, notas y navegación con teclado.
"use client";

import Decimal from "decimal.js";
import type { Dispatch } from "react";
import type { PriceLineResult } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { CvGroupRow } from "./cv-group-row";
import { CvItemRow } from "./cv-item-row";
import { CvNoteRow } from "./cv-note-row";
import { COLUMNS, type ColumnKey } from "./grid-columns";
import { handleGridKeyDown } from "./grid-keyboard";
import type { LinesAction, LinesState } from "./use-cv-lines-state";

type Props = {
  state: LinesState;
  results: Map<string, PriceLineResult>;
  columns: ColumnKey[];
  options: CvGridOptions;
  canEdit: boolean;
  dispatch: Dispatch<LinesAction>;
};

export function CvLineGrid({
  state,
  results,
  columns,
  options,
  canEdit,
  dispatch,
}: Props) {
  const rowOf = new Map(state.lines.map((line, index) => [line.key, index]));
  const sections = [null, ...state.groups.map((group) => group.key)];
  const productsByCode = new Map(
    options.products.map((product) => [product.code.toUpperCase(), product]),
  );

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
      className="overflow-x-auto rounded-xl border bg-card"
      onKeyDown={handleGridKeyDown}
    >
      <table className="w-max min-w-full border-collapse text-left">
        <colgroup>
          {columns.map((key) => (
            <col key={key} style={{ width: COLUMNS[key].width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b">
            {columns.map((key) => (
              <th
                key={key}
                scope="col"
                className={`px-2.5 py-2 text-xs font-medium whitespace-nowrap text-muted-foreground ${"align" in COLUMNS[key] ? "text-right" : ""}`}
              >
                {COLUMNS[key].label}
              </th>
            ))}
          </tr>
        </thead>
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
