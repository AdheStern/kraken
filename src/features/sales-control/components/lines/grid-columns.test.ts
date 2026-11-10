// src/features/sales-control/components/lines/grid-columns.test.ts
// Columnas visibles de la grilla del CV: costos según permiso y columnas opcionales (PO#) solo si se muestran.
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

  it("sin permiso de costos quita costo, factor y costo total (regla 12)", () => {
    const columns = visibleColumns(false, new Set());
    expect(columns).not.toContain("unitCost");
    expect(columns).not.toContain("factor");
    expect(columns).not.toContain("totalCost");
  });
});
