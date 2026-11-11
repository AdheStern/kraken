// src/features/sales-control/paste-into-leasing.test.ts
// Pegar desde Excel en el leasing (AGENTS.md §2.1, decisión 2026-11-11): reparte desde la celda enfocada, crea las
// filas que faltan, salta el costo total y, en la versión aprobada, solo escribe notas, seriales y PO#.
import { describe, expect, it } from "vitest";
import { blankLeasingLine, pasteIntoLeasing } from "./paste-into-leasing";

const OPTIONS = {
  suppliers: [{ id: "s-ingram", label: "INGRAM MICRO" }],
  technologies: [{ id: "t-apc", label: "APC" }],
};
const existing = () => [{ ...blankLeasingLine(), key: "l1", id: "id-1" }];

describe("pasteIntoLeasing", () => {
  it("reparte las celdas desde Proveedor y crea las filas que faltan", () => {
    const result = pasteIntoLeasing(
      existing(),
      [
        [
          "Ingram Micro",
          "apc",
          "SMT1500",
          "UPS 1.5 kVA",
          "2",
          "1.234,50",
          "2469",
          "Rack A",
          "S1, S2",
          "PO-9",
        ],
        ["Otro", "APC", "", "PDU", "1", "80"],
      ],
      { row: 0, col: 0 },
      OPTIONS,
      { postSaleOnly: false },
    );
    expect(result.touched).toBe(2);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      key: "l1",
      supplierId: "s-ingram",
      technologyId: "t-apc",
      code: "SMT1500",
      description: "UPS 1.5 kVA",
      quantity: "2",
      unitCostUsd: "1234.50",
      notes: "Rack A",
      serials: "S1, S2",
      poNumber: "PO-9",
    });
    expect(result.lines[1]).toMatchObject({
      id: null,
      supplierId: null,
      description: "PDU",
    });
    expect(result.unmatched).toEqual(["Proveedor «Otro»"]);
  });

  it("desde una columna del medio solo escribe las que siguen", () => {
    const result = pasteIntoLeasing(
      existing(),
      [["Nota pegada", "S9"]],
      { row: 0, col: 7 },
      OPTIONS,
      { postSaleOnly: false },
    );
    expect(result.lines[0]).toMatchObject({
      description: "",
      notes: "Nota pegada",
      serials: "S9",
    });
  });

  it("en la versión aprobada solo toca notas, seriales y PO# de las filas existentes", () => {
    const result = pasteIntoLeasing(
      existing(),
      [
        ["UPS", "3", "90", "", "Nota", "S1", "PO-1"],
        ["No entra", "1", "1"],
      ],
      { row: 0, col: 3 },
      OPTIONS,
      { postSaleOnly: true },
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({
      description: "",
      quantity: "1",
      notes: "Nota",
      serials: "S1",
      poNumber: "PO-1",
    });
  });
});
