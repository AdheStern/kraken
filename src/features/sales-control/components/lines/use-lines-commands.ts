// src/features/sales-control/components/lines/use-lines-commands.ts
// Comandos masivos del editor de líneas: pegar un bloque desde Excel, aplicar un factor a un lote o a una
// tecnología y poner el mismo valor de una columna desplegable en todas las líneas o en las de un lote. Actualizan el estado y dejan un aviso con el resultado.
"use client";

import type { Dispatch } from "react";
import { applyFactorToDrafts } from "../../apply-factor-to-drafts";
import { type FillScope, fillColumn } from "../../fill-column";
import { pasteIntoLines } from "../../paste-into-lines";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import { COLUMNS, type ColumnKey } from "./grid-columns";
import type { GridFill } from "./grid-header";
import type { LinesNoticeValue } from "./lines-notice";
import type { SelectColumnKey } from "./select-columns";
import {
  blankLine,
  type LinesAction,
  type LinesState,
} from "./use-cv-lines-state";

type Args = {
  state: LinesState;
  columns: ColumnKey[];
  options: CvGridOptions;
  dispatch: Dispatch<LinesAction>;
  setNotice: (notice: LinesNoticeValue) => void;
};

export function useLinesCommands({
  state,
  columns,
  options,
  dispatch,
  setNotice,
}: Args) {
  function pasteBlock(
    target: { lineKey: string; column: ColumnKey },
    matrix: string[][],
  ) {
    const result = pasteIntoLines(
      state,
      matrix,
      target,
      columns,
      options,
      (groupKey) => blankLine("ITEM", groupKey),
    );
    dispatch({ type: "setLines", lines: result.lines });
    const unknown =
      result.unmatched.length > 0
        ? ` No se reconoció: ${result.unmatched.slice(0, 4).join(", ")}.`
        : "";
    setNotice({
      tone: unknown ? "error" : "info",
      text: `Se pegaron ${result.touched} filas.${unknown}`,
    });
  }

  function applyFactor(
    factor: string,
    shouldApply: (line: CvLineDraft) => boolean,
    scope: string,
  ) {
    const result = applyFactorToDrafts(state.lines, factor, shouldApply);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    dispatch({ type: "setLines", lines: result.lines });
    const skipped =
      result.skipped > 0
        ? ` ${result.skipped} sin costo o incompletas quedaron igual.`
        : "";
    setNotice({
      tone: "info",
      text: `Factor aplicado a ${result.applied} líneas de ${scope}.${skipped}`,
    });
  }

  function applyTechnologyFactor(technologyId: string, factor: string) {
    const label =
      options.technologies.find((t) => t.id === technologyId)?.label ??
      "la tecnología";
    applyFactor(factor, (line) => line.technologyId === technologyId, label);
  }

  function applyGroupFactor(groupKey: string, factor: string) {
    const name =
      state.groups.find((g) => g.key === groupKey)?.name ?? "el lote";
    applyFactor(factor, (line) => line.groupKey === groupKey, name);
  }

  function fillSelectColumn(
    column: SelectColumnKey,
    value: string,
    scope: FillScope,
  ) {
    const result = fillColumn(state.lines, column, value, scope);
    dispatch({ type: "setLines", lines: result.lines });
    const group = state.groups.find((g) => g.key === scope.groupKey);
    const where = group ? ` de ${group.name}` : "";
    const count = `${result.touched} ${result.touched === 1 ? "línea" : "líneas"}`;
    setNotice({
      tone: "info",
      text:
        result.touched > 0
          ? `${COLUMNS[column].label}: se aplicó a ${count}${where}.`
          : `Ninguna línea${where} cambió: ya tenían ese valor o no estaban vacías.`,
    });
  }

  const fillFor = (groupKey?: string): GridFill => ({
    options,
    onFill: (column, value, onlyEmpty) =>
      fillSelectColumn(column, value, { groupKey, onlyEmpty }),
  });

  return { pasteBlock, applyTechnologyFactor, applyGroupFactor, fillFor };
}
