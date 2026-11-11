// src/features/sales-control/components/leasing/use-leasing-paste.ts
// Pegar desde Excel en la tabla de leasing: un bloque con tabuladores o saltos se reparte en las celdas desde la
// enfocada, como en la grilla de líneas (AGENTS.md §2.1, decisión 2026-11-11).
"use client";

import { type ClipboardEvent, useState } from "react";
import { parseTsv } from "@/domain/sales-control/parse-tsv";
import { pasteIntoLeasing } from "../../paste-into-leasing";
import type { CvLeasingLineDraft } from "../../schemas/cv-leasing-schema";
import type { CvGridOptions } from "../../types";
import { isBlockPaste } from "../lines/grid-events";

type Args = {
  lines: CvLeasingLineDraft[];
  setLines: (lines: CvLeasingLineDraft[]) => void;
  options: CvGridOptions;
  canEdit: boolean;
  canEditPostSale: boolean;
};

export function useLeasingPaste({
  lines,
  setLines,
  options,
  canEdit,
  canEditPostSale,
}: Args) {
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    if (!canEdit && !canEditPostSale) return;
    const element = event.target as HTMLElement;
    const text = event.clipboardData.getData("text/plain");
    const cell = element.dataset.cell;
    if (!cell || !isBlockPaste(text, false)) return;
    event.preventDefault();
    const [row, col] = cell.split(":").map(Number);
    const result = pasteIntoLeasing(
      lines,
      parseTsv(text),
      { row, col },
      options,
      { postSaleOnly: !canEdit },
    );
    setLines(result.lines);
    const unknown =
      result.unmatched.length > 0
        ? ` No se reconoció: ${result.unmatched.slice(0, 4).join(", ")}.`
        : "";
    setPasteNotice(`Se pegaron ${result.touched} filas.${unknown}`);
  }

  return { onPaste, pasteNotice };
}
