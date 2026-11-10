// src/features/sales-control/fill-column.test.ts
// «Aplicar a todas» en las columnas desplegables de la grilla del CV: alcance, solo vacías, notas y el tipo, que
// borra el rango de activación como la celda (AGENTS.md §2.1).
import { describe, expect, it } from "vitest";
import { blankLine } from "./components/lines/use-cv-lines-state";
import { fillColumn } from "./fill-column";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

const item = (overrides: Partial<CvLineDraft> = {}) => ({
  ...blankLine("ITEM", null),
  ...overrides,
});

describe("fillColumn", () => {
  it("pone el área en todos los ítems y deja las notas igual", () => {
    const note = { ...blankLine("NOTA", null), description: "Initial Term" };
    const lines = [item(), item({ areaId: "a-tel" }), note];
    const result = fillColumn(lines, "area", "a-net", { onlyEmpty: false });
    expect(result.touched).toBe(2);
    expect(result.lines.map((l) => l.areaId)).toEqual(["a-net", "a-net", null]);
    expect(result.lines[2]).toBe(note);
  });

  it("solo a las vacías respeta lo ya elegido", () => {
    const lines = [item(), item({ supplierId: "s-otro" })];
    const result = fillColumn(lines, "supplier", "s-ingram", {
      onlyEmpty: true,
    });
    expect(result.touched).toBe(1);
    expect(result.lines.map((l) => l.supplierId)).toEqual([
      "s-ingram",
      "s-otro",
    ]);
  });

  it("con un lote, cambia solo sus líneas", () => {
    const lines = [item(), item({ groupKey: "lote-1" })];
    const result = fillColumn(lines, "technology", "t-cisco", {
      groupKey: "lote-1",
      onlyEmpty: false,
    });
    expect(result.lines.map((l) => l.technologyId)).toEqual([null, "t-cisco"]);
  });

  it("cambiar el tipo a uno que no es licencia borra la activación", () => {
    const licence = item({
      itemType: "INTANGIBLE",
      activationStart: "2026-11-01",
      activationEnd: "2026-11-30",
    });
    const result = fillColumn([licence], "itemType", "HARDWARE", {
      onlyEmpty: false,
    });
    expect(result.lines[0]).toMatchObject({
      itemType: "HARDWARE",
      activationStart: "",
      activationEnd: "",
    });
  });

  it("no cuenta las líneas que ya tenían ese valor", () => {
    const lines = [item({ unitId: "u-pieza" })];
    const result = fillColumn(lines, "unit", "u-pieza", { onlyEmpty: false });
    expect(result.touched).toBe(0);
    expect(result.lines[0]).toBe(lines[0]);
  });
});
