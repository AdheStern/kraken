// src/features/sales-control/parse-serials.test.ts
// Seriales de una línea del CV como columna opcional (AGENTS.md §2.1, decisión 2026-11-12): uno por renglón y, al
// pegar desde Excel, una celda con varios renglones o comas cae como lista.
import { describe, expect, it } from "vitest";
import { visibleColumns } from "./components/lines/grid-columns";
import { blankLine } from "./components/lines/use-cv-lines-state";
import { parseSerials } from "./parse-serials";
import { pasteIntoLines } from "./paste-into-lines";
import type { CvGridOptions } from "./types";

const OPTIONS: CvGridOptions = {
  areas: [],
  suppliers: [],
  technologies: [],
  units: [],
  projects: [],
  products: [],
};

describe("parseSerials", () => {
  it("parte por renglón, coma, punto y coma o tabulador y quita vacíos", () => {
    expect(parseSerials("FOC1\r\nFOC2\n\n, FOC3;FOC4\tFOC5 ")).toEqual([
      "FOC1",
      "FOC2",
      "FOC3",
      "FOC4",
      "FOC5",
    ]);
    expect(parseSerials("  \n ")).toEqual([]);
  });
});

describe("pasteIntoLines: columna de seriales", () => {
  it("una celda pegada con varios renglones queda como lista de seriales", () => {
    const first = { ...blankLine("ITEM", null), quantity: "3" };
    const columns = visibleColumns(true, new Set(["serials"]));
    const result = pasteIntoLines(
      { groups: [], lines: [first] },
      [["Rack A", "SN1\nSN2, SN3"]],
      { lineKey: first.key, column: "notes" },
      columns,
      OPTIONS,
      (groupKey) => blankLine("ITEM", groupKey),
    );
    expect(result.lines[0]).toMatchObject({
      notes: "Rack A",
      serials: ["SN1", "SN2", "SN3"],
    });
  });
});
