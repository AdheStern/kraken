// src/features/sales-control/components/lines/cv-line-grid.tsx
// Grilla tipo planilla de las líneas del CV: secciones por lote, ítems con subítems (1, 1.1), notas y navegación
// con teclado.
"use client";

import type { ClipboardEvent, Dispatch } from "react";
import { numberItems } from "@/domain/sales-control/number-items";
import type { PriceLineResult } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { CvGroupRow } from "./cv-group-row";
import { CvItemRow } from "./cv-item-row";
import { CvNoteRow } from "./cv-note-row";
import type { ColumnKey } from "./grid-columns";
import { blockPaste, typeProductCode } from "./grid-events";
import { type GridFill, GridHeader } from "./grid-header";
import { handleGridKeyDown } from "./grid-keyboard";
import { groupSubtotal } from "./group-subtotal";
import { isSelectColumn } from "./select-columns";
import type { LinesAction, LinesState } from "./use-cv-lines-state";
import type { LineDetailInfo } from "./use-lines-pricing";

type Props = {
  state: LinesState;
  results: Map<string, PriceLineResult>;
  columns: ColumnKey[];
  options: CvGridOptions;
  canEdit: boolean;
  canEditPostSale: boolean;
  dispatch: Dispatch<LinesAction>;
  details: Map<string, LineDetailInfo>;
  onOpenDetail: (lineKey: string) => void;
  onPasteBlock: (
    target: { lineKey: string; column: ColumnKey },
    matrix: string[][],
  ) => void;
  onApplyGroupFactor: (groupKey: string, factor: string) => void;
  // Sin él (no se puede editar), los encabezados y los lotes no ofrecen «Aplicar a todas».
  fillFor?: (groupKey?: string) => GridFill;
};

export function CvLineGrid({
  state,
  results,
  columns,
  options,
  canEdit,
  canEditPostSale,
  dispatch,
  details,
  onOpenDetail,
  onPasteBlock,
  onApplyGroupFactor,
  fillFor,
}: Props) {
  const rowOf = new Map(state.lines.map((line, index) => [line.key, index]));
  const sections = [null, ...state.groups.map((group) => group.key)];
  // TRAMPA: state.lines ya está en el orden visible (por lote); la numeración se calcula sobre ese orden.
  const numbering = numberItems(
    state.lines.map((line) => ({ ...line, sectionKey: line.groupKey })),
  );
  const fillColumns = columns.filter(isSelectColumn);
  const productsByCode = new Map(
    options.products.map((product) => [product.code.toUpperCase(), product]),
  );

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const paste = canEdit ? blockPaste(event, state.lines, columns) : null;
    if (!paste) return;
    event.preventDefault();
    onPasteBlock(paste.target, paste.matrix);
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
      label: numbering.labels[row],
      isOrphan: numbering.orphans.includes(row),
      color: line.color,
      onColor: (color: string | null) =>
        dispatch({ type: "updateLine", key: line.key, patch: { color } }),
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
        canEditPostSale={canEditPostSale}
        result={results.get(line.key) ?? { ok: false, issues: [] }}
        detailState={details.get(line.key)?.state ?? "empty"}
        onDetail={() => onOpenDetail(line.key)}
        onChange={(patch) =>
          dispatch({ type: "updateLine", key: line.key, patch })
        }
        onProductCode={(code) =>
          typeProductCode(dispatch, productsByCode, line.key, code)
        }
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
        <GridHeader columns={columns} fill={fillFor?.()} />
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
                  subtotalSaleUsd={groupSubtotal(lines, results)}
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
                  fillColumns={fillColumns}
                  fill={fillFor?.(group.key)}
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
