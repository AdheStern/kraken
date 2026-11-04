// src/features/inventory/components/receipt-draft.test.ts
// Filas del ingreso cargadas por mosaicos (AGENTS.md §2.8): una por código, ocupan la primera fila vacía y nunca
// dejan la grilla sin filas.
import { describe, expect, it } from "vitest";
import { EMPTY_ROW, removeReceiptRow, upsertReceiptRow } from "./receipt-draft";

const row = (code: string, quantity: string) => ({
  ...EMPTY_ROW,
  code,
  quantity,
  unitCostUsd: "1",
});

describe("upsertReceiptRow", () => {
  it("ocupa la primera fila vacía y luego agrega al final", () => {
    const one = upsertReceiptRow([EMPTY_ROW, EMPTY_ROW], row("A", "1"));
    expect(one.map((r) => r.code)).toEqual(["A", ""]);
    const two = upsertReceiptRow(one, row("B", "1"));
    expect(upsertReceiptRow(two, row("C", "1")).map((r) => r.code)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("reemplaza la fila del mismo código sin distinguir mayúsculas", () => {
    const rows = upsertReceiptRow([row("cab-1", "1")], row("CAB-1", "4"));
    expect(rows).toEqual([row("CAB-1", "4")]);
  });
});

describe("removeReceiptRow", () => {
  it("quita la fila y deja una vacía si no queda ninguna", () => {
    expect(removeReceiptRow([row("A", "1"), row("B", "1")], "a")).toEqual([
      row("B", "1"),
    ]);
    expect(removeReceiptRow([row("A", "1")], "A")).toEqual([EMPTY_ROW]);
  });
});
