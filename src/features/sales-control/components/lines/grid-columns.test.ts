// src/features/sales-control/components/lines/grid-columns.test.ts
// Columnas visibles de la grilla del CV: costos según permiso y columnas opcionales (PO#, GROSS UP, RET DIMA) solo si
// se muestran.
import { describe, expect, it } from "vitest";
import { visibleColumns } from "./grid-columns";

describe("visibleColumns", () => {
  it("oculta las columnas opcionales que no se muestran", () => {
    const columns = visibleColumns(true, new Set());
    expect(columns).not.toContain("poNumber");
    expect(columns).toContain("notes");
  });

  it("deja el PO# al final, antes de las acciones", () => {
    const columns = visibleColumns(true, new Set(["poNumber"]));
    expect(columns.slice(-3)).toEqual(["notes", "poNumber", "actions"]);
  });

  it("GROSS UP y RET DIMA van tras el costo total, como en el Excel", () => {
    const columns = visibleColumns(true, new Set(["grossUp", "retDima"]));
    const at = columns.indexOf("totalCost");
    expect(columns.slice(at, at + 4)).toEqual([
      "totalCost",
      "grossUp",
      "retDima",
      "totalSale",
    ]);
  });

  it("GROSS UP y RET DIMA son datos de costo (regla 12)", () => {
    const columns = visibleColumns(false, new Set(["grossUp", "retDima"]));
    expect(columns).not.toContain("grossUp");
    expect(columns).not.toContain("retDima");
  });

  it("sin permiso de costos quita costo, factor y costo total (regla 12)", () => {
    const columns = visibleColumns(false, new Set());
    expect(columns).not.toContain("unitCost");
    expect(columns).not.toContain("factor");
    expect(columns).not.toContain("totalCost");
  });
});
