// src/features/sales-control/components/lines/use-cv-lines-state.test.ts
// Agregar varias líneas de golpe y descartar al guardar las nuevas que quedaron vacías (decisión 2026-11-11).
import { describe, expect, it } from "vitest";
import { blankLine, isBlankLine, reduceLines } from "./use-cv-lines-state";

const GROUP = { key: "g1", id: null, name: "LOTE 1" };

describe("reduceLines: addLine", () => {
  it("agrega la cantidad pedida al lote, después de sus líneas", () => {
    const first = { ...blankLine("ITEM", "g1"), description: "Switch" };
    const state = reduceLines(
      { groups: [GROUP], lines: [first] },
      { type: "addLine", groupKey: "g1", kind: "ITEM", count: 30 },
    );
    expect(state.lines).toHaveLength(31);
    expect(state.lines[0]).toBe(first);
    expect(state.lines.every((line) => line.groupKey === "g1")).toBe(true);
    expect(new Set(state.lines.map((line) => line.key)).size).toBe(31);
  });

  it("sin cantidad agrega una sola, como antes", () => {
    const state = reduceLines(
      { groups: [], lines: [] },
      { type: "addLine", groupKey: null, kind: "NOTA" },
    );
    expect(state.lines.map((line) => line.kind)).toEqual(["NOTA"]);
  });
});

describe("isBlankLine", () => {
  it("una línea nueva sin tocar está vacía, aunque sea subítem", () => {
    expect(isBlankLine(blankLine("ITEM", "g1"))).toBe(true);
    expect(isBlankLine({ ...blankLine("NOTA", null), isSubItem: true })).toBe(
      true,
    );
  });

  it("con cualquier dato, o ya guardada, no está vacía", () => {
    const line = blankLine("ITEM", null);
    expect(isBlankLine({ ...line, description: "Licencia" })).toBe(false);
    expect(isBlankLine({ ...line, quantity: "2" })).toBe(false);
    expect(isBlankLine({ ...line, areaId: "area-1" })).toBe(false);
    expect(
      isBlankLine({ ...line, id: "0195f0e0-0000-7000-8000-000000000000" }),
    ).toBe(false);
  });
});
