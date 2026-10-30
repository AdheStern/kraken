// src/features/sales-control/paste-and-factor.test.ts
// Pegar desde Excel en la grilla y aplicar factor por lote o tecnología.
import { describe, expect, it } from "vitest";
import { applyFactorToDrafts } from "./apply-factor-to-drafts";
import { visibleColumns } from "./components/lines/grid-columns";
import { blankLine } from "./components/lines/use-cv-lines-state";
import { pasteIntoLines } from "./paste-into-lines";
import type { CvLineDraft } from "./schemas/cv-lines-schema";
import type { CvGridOptions } from "./types";

const OPTIONS: CvGridOptions = {
  areas: [
    {
      id: "a-net",
      label: "DIMANET",
      hint: "Redes, infraestructura y seguridad",
    },
  ],
  suppliers: [{ id: "s-ingram", label: "Ingram Micro" }],
  technologies: [
    { id: "t-cisco", label: "Cisco" },
    { id: "t-huawei", label: "Huawei" },
  ],
  units: [
    {
      id: "u-pieza",
      label: "PIEZA",
      hint: "Pieza",
      isHours: false,
      isTerm: false,
    },
  ],
  projects: [],
  products: [
    {
      id: "p-1",
      code: "C9300-48P-E",
      description: "Catalyst 9300",
      technologyId: "t-cisco",
      unitId: "u-pieza",
      itemType: "HARDWARE",
    },
  ],
};
const COLUMNS = visibleColumns(true);
const line = (overrides: Partial<CvLineDraft> = {}) => ({
  ...blankLine("ITEM", null),
  ...overrides,
});

describe("pasteIntoLines", () => {
  it("vuelca el bloque desde la celda enfocada y crea las filas que faltan", () => {
    const first = line();
    const state = { groups: [], lines: [first] };
    const matrix = [
      ["C9300-48P-E", "", "dimanet", "pieza", "2", "1.234,50"],
      ["XYZ-1", "Cable especial", "DIMANET", "PIEZA", "3", "10,5"],
    ];
    const result = pasteIntoLines(
      state,
      matrix,
      { lineKey: first.key, column: "code" },
      COLUMNS,
      OPTIONS,
      (g) => line({ groupKey: g }),
    );
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      areaId: "a-net",
      productId: "p-1",
      description: "Catalyst 9300",
      technologyId: "t-cisco",
      quantity: "2",
      unitCostUsd: "1234.50",
    });
    expect(result.lines[1]).toMatchObject({
      code: "XYZ-1",
      productId: null,
      description: "Cable especial",
      unitCostUsd: "10.5",
    });
    expect(result.unmatched).toEqual([]);
  });

  it("pegar en factor o en venta fija el modo de precio y reporta catálogos desconocidos", () => {
    const first = line();
    const result = pasteIntoLines(
      { groups: [], lines: [first] },
      [["Proveedor X", "", "", "", "", "", "", "", "2,50"]],
      { lineKey: first.key, column: "supplier" },
      COLUMNS,
      OPTIONS,
      (g) => line({ groupKey: g }),
    );
    expect(result.lines[0]).toMatchObject({
      pricingSource: "FACTOR",
      factor: "2.50",
    });
    expect(result.unmatched).toEqual(["Proveedor «Proveedor X»"]);
  });

  it("no invade el lote siguiente: las filas extra se crean en el mismo lote", () => {
    const a = line({ groupKey: null });
    const b = line({ groupKey: "lote-1" });
    const state = {
      groups: [{ key: "lote-1", id: null, name: "LOTE 1" }],
      lines: [a, b],
    };
    const result = pasteIntoLines(
      state,
      [["Uno"], ["Dos"]],
      { lineKey: a.key, column: "description" },
      COLUMNS,
      OPTIONS,
      (g) => line({ groupKey: g }),
    );
    expect(result.lines.map((l) => [l.groupKey, l.description])).toEqual([
      [null, "Uno"],
      [null, "Dos"],
      ["lote-1", ""],
    ]);
  });

  it("en una nota solo pega la descripción", () => {
    const note = { ...blankLine("NOTA", null) };
    const result = pasteIntoLines(
      { groups: [], lines: [note] },
      [["Initial Term", "5"]],
      { lineKey: note.key, column: "description" },
      COLUMNS,
      OPTIONS,
      (g) => line({ groupKey: g }),
    );
    expect(result.lines[0]).toMatchObject({
      kind: "NOTA",
      description: "Initial Term",
      quantity: "",
    });
  });
});

describe("applyFactorToDrafts", () => {
  const lines = [
    line({ technologyId: "t-cisco", unitCostUsd: "100" }),
    line({
      technologyId: "t-cisco",
      unitCostUsd: "0",
      pricingSource: "PRECIO",
      unitSaleUsd: "50",
    }),
    line({ technologyId: "t-huawei", unitCostUsd: "80" }),
  ];

  it("FACTOR CISCO: aplica a las líneas con costo y salta la de costo 0", () => {
    const result = applyFactorToDrafts(
      lines,
      "1,35",
      (l) => l.technologyId === "t-cisco",
    );
    if (!result.ok) throw new Error(result.message);
    expect(result.applied).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.lines[0]).toMatchObject({
      pricingSource: "FACTOR",
      factor: "1.35",
    });
    expect(result.lines[1]).toBe(lines[1]);
    expect(result.lines[2]).toBe(lines[2]);
  });

  it.each([["0"], ["abc"], ["1.355"]])("rechaza el factor %s", (factor) => {
    expect(applyFactorToDrafts(lines, factor, () => true).ok).toBe(false);
  });
});
