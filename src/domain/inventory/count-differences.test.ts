// src/domain/inventory/count-differences.test.ts
// Conteo físico contra la foto del sistema (AGENTS.md §2.8): alcance completo o parcial, delta por cantidad y
// listas de seriales faltantes y sobrantes.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { type CountItem, computeCountDifferences } from "./count-differences";

const item = (
  productId: string,
  quantity: number,
  serials: string[] = [],
): CountItem => ({
  productId,
  isSerialized: serials.length > 0,
  quantity: new Decimal(quantity),
  serials,
});

const summary = (differences: ReturnType<typeof computeCountDifferences>) =>
  differences.map((d) => ({
    productId: d.productId,
    delta: d.delta.toNumber(),
    missing: d.missingSerials,
    extra: d.extraSerials,
  }));

describe("computeCountDifferences", () => {
  const snapshot = [
    item("cable", 10),
    item("switch", 2, ["S1", "S2"]),
    item("rack", 1),
  ];

  it("en un conteo completo, lo no contado es faltante", () => {
    const counted = [item("cable", 8), item("switch", 2, ["S1", "S2"])];
    expect(
      summary(computeCountDifferences("COMPLETO", snapshot, counted)),
    ).toEqual([
      { productId: "cable", delta: -2, missing: [], extra: [] },
      { productId: "rack", delta: -1, missing: [], extra: [] },
    ]);
  });

  it("en un conteo parcial, solo se comparan los productos contados", () => {
    const counted = [item("cable", 12), item("patch", 3)];
    expect(
      summary(computeCountDifferences("PARCIAL", snapshot, counted)),
    ).toEqual([
      { productId: "cable", delta: 2, missing: [], extra: [] },
      { productId: "patch", delta: 3, missing: [], extra: [] },
    ]);
  });

  it("compara seriales aunque la cantidad coincida", () => {
    const counted = [item("switch", 2, ["S1", "S9"])];
    expect(
      summary(computeCountDifferences("PARCIAL", snapshot, counted)),
    ).toEqual([
      { productId: "switch", delta: 0, missing: ["S2"], extra: ["S9"] },
    ]);
  });

  it("suma lecturas repetidas y un serial leído dos veces cuenta una vez", () => {
    const counted = [
      item("cable", 4),
      item("cable", 6),
      item("switch", 1, ["S1"]),
      item("switch", 1, [" S1 ", "S2"]),
    ];
    expect(computeCountDifferences("PARCIAL", snapshot, counted)).toEqual([]);
  });
});
