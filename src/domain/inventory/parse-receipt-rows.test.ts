// src/domain/inventory/parse-receipt-rows.test.ts
// Filas de un ingreso pegadas desde Excel (AGENTS.md §2.8): encabezado, números en formato local, costo
// obligatorio que admite 0 y seriales que cuadran con la cantidad sin repetirse.
import { describe, expect, it } from "vitest";
import {
  parseReceiptRows,
  type ReceiptDraftRow,
  toReceiptDraftRows,
} from "./parse-receipt-rows";

const row = (over: Partial<ReceiptDraftRow>): ReceiptDraftRow => ({
  code: "C9300-48P",
  description: "",
  quantity: "1",
  unitCostUsd: "100",
  serials: "",
  ...over,
});

describe("toReceiptDraftRows", () => {
  it("salta el encabezado y reparte las columnas", () => {
    const text =
      "Código\tDescripción\tCantidad\tCosto\tSeriales\nfg-100f\tFirewall\t2\t1.234,50\tS1, S2\n";
    expect(toReceiptDraftRows(text)).toEqual([
      {
        code: "fg-100f",
        description: "Firewall",
        quantity: "2",
        unitCostUsd: "1.234,50",
        serials: "S1, S2",
      },
    ]);
  });
});

describe("parseReceiptRows", () => {
  it("normaliza código, números y seriales", () => {
    const { lines, issues } = parseReceiptRows([
      row({
        code: " fg-100f ",
        quantity: "2",
        unitCostUsd: "1.234,50",
        serials: "S1, S2",
      }),
    ]);
    expect(issues).toEqual([]);
    expect(lines[0]).toMatchObject({ code: "FG-100F", serials: ["S1", "S2"] });
    expect(lines[0].unitCostUsd.toFixed(2)).toBe("1234.50");
  });

  it("exige el costo pero admite 0", () => {
    expect(parseReceiptRows([row({ unitCostUsd: "0" })]).issues).toEqual([]);
    expect(
      parseReceiptRows([row({ unitCostUsd: "" })]).issues[0].message,
    ).toMatch(/costo unitario/);
    expect(
      parseReceiptRows([row({ unitCostUsd: "-1" })]).issues[0].message,
    ).toMatch(/0 o más/);
  });

  it("rechaza cantidades inválidas y seriales que no cuadran o se repiten", () => {
    const { issues } = parseReceiptRows([
      row({ quantity: "0" }),
      row({ quantity: "abc" }),
      row({ quantity: "3", serials: "S1 S2" }),
      row({ serials: "S9" }),
      row({ serials: "S9" }),
      row({ code: "", quantity: "1" }),
    ]);
    expect(issues.map((i) => i.row)).toEqual([1, 2, 3, 5, 6]);
    expect(issues[2].message).toMatch(/2 seriales para 3 unidades/);
    expect(issues[3].message).toMatch(/S9 está repetido/);
  });

  it("ignora filas vacías y pide al menos una línea", () => {
    const empty = row({ code: "", quantity: "", unitCostUsd: "" });
    expect(parseReceiptRows([empty]).issues).toEqual([
      { row: 0, message: "Agrega al menos una línea." },
    ]);
    expect(parseReceiptRows([empty, row({})]).lines).toHaveLength(1);
  });
});
