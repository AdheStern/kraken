// src/features/sales-control/components/lines/use-lines-commands.ts
// Comandos masivos del editor de líneas: pegar un bloque desde Excel y aplicar un factor a un lote
// o a una tecnología. Actualizan el estado y dejan un aviso con el resultado.
"use client";

import type { Dispatch } from "react";
import { applyFactorToDrafts } from "../../apply-factor-to-drafts";
import { pasteIntoLines } from "../../paste-into-lines";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions } from "../../types";
import type { ColumnKey } from "./grid-columns";
import type { LinesNoticeValue } from "./lines-notice";
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

  return { pasteBlock, applyTechnologyFactor, applyGroupFactor };
}
