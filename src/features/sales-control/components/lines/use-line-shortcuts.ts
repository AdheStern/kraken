// src/features/sales-control/components/lines/use-line-shortcuts.ts
// Atajos del editor de líneas en borrador: Alt+N línea, Alt+M nota, Alt+L lote y Alt+O el detalle de la línea
// donde está el foco (decisión 2026-11-05).
"use client";

import type { Dispatch } from "react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import type { LinesAction } from "./use-cv-lines-state";

export function useLineShortcuts(
  canEdit: boolean,
  dispatch: Dispatch<LinesAction>,
  openDetail: (key: string) => void,
): void {
  useShortcuts(
    canEdit
      ? {
          "cv.addLine": () =>
            dispatch({ type: "addLine", groupKey: null, kind: "ITEM" }),
          "cv.addNote": () =>
            dispatch({ type: "addLine", groupKey: null, kind: "NOTA" }),
          "cv.addGroup": () => dispatch({ type: "addGroup" }),
          "cv.lineDetail": () => {
            const row =
              document.activeElement?.closest<HTMLElement>("[data-line-key]");
            if (row?.dataset.lineKey) openDetail(row.dataset.lineKey);
          },
        }
      : {},
  );
}
