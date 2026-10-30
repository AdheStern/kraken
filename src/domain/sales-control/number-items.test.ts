// src/domain/sales-control/number-items.test.ts
// Numeración de ítems con subítems (AGENTS.md §2.1): 1, 1.1, 1.2, 2; notas sin número; lotes y huérfanos.
import { describe, expect, it } from "vitest";
import { type NumberableLine, numberItems } from "./number-items";

const item = (sectionKey: string | null = null): NumberableLine => ({
  kind: "ITEM",
  isSubItem: false,
  sectionKey,
});
const sub = (sectionKey: string | null = null): NumberableLine => ({
  kind: "ITEM",
  isSubItem: true,
  sectionKey,
});
const note = (sectionKey: string | null = null): NumberableLine => ({
  kind: "NOTA",
  isSubItem: false,
  sectionKey,
});

describe("numberItems", () => {
  it("numera principales y subítems; las notas no cortan ni llevan número", () => {
    expect(
      numberItems([item(), sub(), note(), sub(), item(), item(), sub()]),
    ).toEqual({
      labels: ["1", "1.1", null, "1.2", "2", "3", "3.1"],
      orphans: [],
    });
  });

  it("sigue la numeración a través de los lotes, como el Excel", () => {
    expect(numberItems([item(), item("L1"), sub("L1"), item("L2")])).toEqual({
      labels: ["1", "2", "2.1", "3"],
      orphans: [],
    });
  });

  it("un subítem sin principal antes en su lote se numera como principal y se marca", () => {
    expect(numberItems([sub(), item(), sub("L1"), sub("L1")])).toEqual({
      labels: ["1", "2", "3", "3.1"],
      orphans: [0, 2],
    });
  });

  it("pasa de 1.9 a 1.10 sin confundirse con 1.1", () => {
    const labels = numberItems([
      item(),
      ...Array.from({ length: 10 }, () => sub()),
    ]).labels;
    expect(labels.at(-1)).toBe("1.10");
  });
});
