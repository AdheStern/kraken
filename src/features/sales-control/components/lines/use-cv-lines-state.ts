// src/features/sales-control/components/lines/use-cv-lines-state.ts
// Estado editable de lotes y líneas de la grilla. El orden de `lines` es el orden en pantalla:
// primero las líneas sin lote y después cada lote con las suyas.
"use client";

import { useReducer } from "react";
import { fillFromProduct } from "../../product-fill";
import type { CvGroupDraft, CvLineDraft } from "../../schemas/cv-lines-schema";
import type { ProductOption } from "../../types";

export type LinesState = { groups: CvGroupDraft[]; lines: CvLineDraft[] };

export type LinesAction =
  | { type: "addLine"; groupKey: string | null; kind: CvLineDraft["kind"] }
  | { type: "updateLine"; key: string; patch: Partial<CvLineDraft> }
  | { type: "removeLine"; key: string }
  | { type: "moveLine"; key: string; offset: -1 | 1 }
  | { type: "applyProduct"; key: string; product: ProductOption }
  | { type: "addGroup" }
  | { type: "renameGroup"; key: string; name: string }
  | { type: "removeGroup"; key: string }
  | { type: "setLines"; lines: CvLineDraft[] }
  | { type: "replace"; state: LinesState };

export function blankLine(
  kind: CvLineDraft["kind"],
  groupKey: string | null,
): CvLineDraft {
  return {
    key: crypto.randomUUID(),
    id: null,
    kind,
    groupKey,
    areaId: null,
    supplierId: null,
    supplyMode: null,
    technologyId: null,
    itemType: null,
    productId: null,
    code: "",
    description: "",
    unitId: null,
    quantity: kind === "ITEM" ? "1" : "",
    unitCostUsd: "",
    pricingSource: "FACTOR",
    factor: "",
    unitSaleUsd: "",
    poNumber: "",
    notes: "",
  };
}

// POR QUÉ: las líneas viven en una lista plana; se reordena por secciones para que posición = orden visible.
export function orderBySection(state: LinesState): CvLineDraft[] {
  const sections = [null, ...state.groups.map((group) => group.key)];
  return sections.flatMap((groupKey) =>
    state.lines.filter((line) => line.groupKey === groupKey),
  );
}

function reduce(state: LinesState, action: LinesAction): LinesState {
  switch (action.type) {
    case "addLine":
      return withLines(state, [
        ...state.lines,
        blankLine(action.kind, action.groupKey),
      ]);
    case "updateLine":
      return withLines(
        state,
        state.lines.map((l) =>
          l.key === action.key ? { ...l, ...action.patch } : l,
        ),
      );
    case "removeLine":
      return withLines(
        state,
        state.lines.filter((l) => l.key !== action.key),
      );
    case "moveLine":
      return withLines(state, move(state.lines, action.key, action.offset));
    case "applyProduct":
      return withLines(
        state,
        state.lines.map((l) =>
          l.key === action.key ? fillFromProduct(l, action.product) : l,
        ),
      );
    case "addGroup": {
      const group = {
        key: crypto.randomUUID(),
        id: null,
        name: `LOTE ${state.groups.length + 1}`,
      };
      return {
        groups: [...state.groups, group],
        lines: [...state.lines, blankLine("ITEM", group.key)],
      };
    }
    case "renameGroup":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.key === action.key ? { ...g, name: action.name } : g,
        ),
      };
    case "removeGroup":
      return withLines(
        { ...state, groups: state.groups.filter((g) => g.key !== action.key) },
        state.lines.map((l) =>
          l.groupKey === action.key ? { ...l, groupKey: null } : l,
        ),
      );
    case "setLines":
      return withLines(state, action.lines);
    case "replace":
      return action.state;
  }
}

function withLines(state: LinesState, lines: CvLineDraft[]): LinesState {
  const next = { ...state, lines };
  return { ...next, lines: orderBySection(next) };
}

function move(
  lines: CvLineDraft[],
  key: string,
  offset: -1 | 1,
): CvLineDraft[] {
  const index = lines.findIndex((l) => l.key === key);
  const target = index + offset;
  if (
    index < 0 ||
    target < 0 ||
    target >= lines.length ||
    lines[target].groupKey !== lines[index].groupKey
  ) {
    return lines;
  }
  const next = [...lines];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function useCvLinesState(initial: LinesState) {
  return useReducer(reduce, initial, (state) => ({
    ...state,
    lines: orderBySection(state),
  }));
}
