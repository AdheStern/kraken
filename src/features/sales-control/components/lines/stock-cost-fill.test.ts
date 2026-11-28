// src/features/sales-control/components/lines/stock-cost-fill.test.ts
// El costo promedio del inventario se propone en las líneas «Stock DIMA» al elegir el producto o la modalidad,
// sin pisar ni volver a llenar lo que escribió el comercial (decisión 2026-11-28).
import { describe, expect, it } from "vitest";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { ProductOption } from "../../types";
import { blankLine, type LinesState, reduceLines } from "./use-cv-lines-state";

const COSTS = new Map([["p1", "412.35"]]);
const PRODUCT: ProductOption = {
  id: "p1",
  code: "C9200-24T",
  description: "Switch Catalyst 9200",
  technologyId: null,
  unitId: null,
  itemType: "HARDWARE",
};

const stateOf = (line: CvLineDraft): LinesState => ({
  groups: [],
  lines: [line],
});

const run = (
  state: LinesState,
  ...actions: Parameters<typeof reduceLines>[1][]
) => actions.reduce((s, action) => reduceLines(s, action, COSTS), state);

describe("costo de inventario en líneas Stock DIMA", () => {
  it("lo llena al elegir el producto si la modalidad ya es Stock DIMA", () => {
    const line = {
      ...blankLine("ITEM", null),
      supplyMode: "STOCK_DIMA" as const,
    };
    const state = run(stateOf(line), {
      type: "applyProduct",
      key: line.key,
      product: PRODUCT,
    });
    expect(state.lines[0].unitCostUsd).toBe("412.35");
  });

  it("lo llena al pasar a Stock DIMA una línea que ya tiene el producto", () => {
    const line = blankLine("ITEM", null);
    const state = run(
      stateOf(line),
      { type: "applyProduct", key: line.key, product: PRODUCT },
      {
        type: "updateLine",
        key: line.key,
        patch: { supplyMode: "STOCK_DIMA" },
      },
    );
    expect(state.lines[0].unitCostUsd).toBe("412.35");
  });

  it("no lo llena en otra modalidad", () => {
    const line = { ...blankLine("ITEM", null), supplyMode: "LOCAL" as const };
    const state = run(stateOf(line), {
      type: "applyProduct",
      key: line.key,
      product: PRODUCT,
    });
    expect(state.lines[0].unitCostUsd).toBe("");
  });

  it("no pisa un costo escrito ni lo repone si el comercial lo borra", () => {
    const line = {
      ...blankLine("ITEM", null),
      supplyMode: "STOCK_DIMA" as const,
      unitCostUsd: "399.00",
    };
    const typed = run(stateOf(line), {
      type: "applyProduct",
      key: line.key,
      product: PRODUCT,
    });
    expect(typed.lines[0].unitCostUsd).toBe("399.00");
    const cleared = run(typed, {
      type: "updateLine",
      key: line.key,
      patch: { unitCostUsd: "" },
    });
    expect(cleared.lines[0].unitCostUsd).toBe("");
  });

  it("sin stock en la ciudad del CV no propone nada", () => {
    const line = {
      ...blankLine("ITEM", null),
      supplyMode: "STOCK_DIMA" as const,
    };
    const state = run(stateOf(line), {
      type: "applyProduct",
      key: line.key,
      product: { ...PRODUCT, id: "p2" },
    });
    expect(state.lines[0].unitCostUsd).toBe("");
  });
});
