// src/features/dashboards/export/board-sheets.test.ts
// Exportación de los tableros (AGENTS.md §6): las hojas de ventas llevan los mismos números que la pantalla y
// el libro se vuelve a leer con sus montos y formatos.
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { sheetsToXlsx } from "@/server/dashboards/sheets-to-xlsx";
import type { SalesDashboard } from "../types";
import { salesSheets } from "./board-sheets";

const kpi = {
  previousUsd: "0.00",
  variationPct: null,
  goalUsd: null,
  progressPct: null,
};

const board: SalesDashboard = {
  periodLabel: "T4 2026",
  previousLabel: "T3 2026",
  sales: { ...kpi, valueUsd: "1385.68", goalUsd: "2000.00", progressPct: 69 },
  margin: { ...kpi, valueUsd: "733.75", marginPct: "65.72" },
  factor: "2.92",
  ownServicesUsd: "269.12",
  hoursSold: {
    minutes: 450,
    previousMinutes: 0,
    variationPct: null,
    goalMinutes: null,
    progressPct: null,
  },
  cvCount: 1,
  monthly: [{ month: "2026-10", saleUsd: "1385.68", goalUsd: null }],
  breakdown: {
    dimension: "AREA",
    rows: [
      {
        key: "a",
        label: "DIMANET",
        saleUsd: "1254.88",
        marginUsd: "733.75",
        marginPct: "65.72",
        cvCount: 1,
        sharePct: 90.6,
      },
    ],
  },
};

describe("exportación del tablero de ventas", () => {
  it("resumen, serie mensual y desglose con montos numéricos", async () => {
    const file = await sheetsToXlsx("Tablero de ventas", salesSheets(board));
    const book = new ExcelJS.Workbook();
    // TRAMPA: los tipos de ExcelJS no aceptan el Buffer genérico de Node; el golden del CV hace lo mismo.
    await book.xlsx.load(file as unknown as ArrayBuffer);
    expect(book.worksheets.map((s) => s.name)).toEqual([
      "Resumen T4 2026",
      "Por mes",
      "Desglose area",
    ]);
    const summary = book.getWorksheet("Resumen T4 2026");
    expect(summary?.getCell("B2").value).toBe(1385.68);
    expect(summary?.getCell("B6").value).toBe(7.5);
    const breakdown = book.getWorksheet("Desglose area");
    expect(breakdown?.getRow(1).getCell(1).value).toBe("Grupo");
    expect(breakdown?.getCell("B2").value).toBe(1254.88);
    expect(breakdown?.getCell("B2").numFmt).toBe("#,##0.00");
  });
});
