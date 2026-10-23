// src/server/dashboards/sheets-to-xlsx.ts
// Escribe hojas tabulares (encabezado + filas) en un libro de Excel con ExcelJS: la exportación de los tableros
// (AGENTS.md §6, ADR-12 para la librería). Montos con formato de 2 decimales; nada de fórmulas.
import ExcelJS from "exceljs";

export type SheetColumn = {
  header: string;
  key: string;
  width?: number;
  format?: "usd" | "pct" | "int" | "text";
};

export type SheetSpec = {
  name: string;
  columns: SheetColumn[];
  rows: Record<string, string | number | null>[];
};

const NUM_FORMATS = { usd: "#,##0.00", pct: "0.0", int: "#,##0" } as const;

export async function sheetsToXlsx(
  title: string,
  sheets: readonly SheetSpec[],
): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  book.creator = "Kraken by DIMA";
  book.title = title;
  for (const spec of sheets) {
    const sheet = book.addWorksheet(spec.name.slice(0, 31));
    sheet.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 18,
      style:
        c.format && c.format !== "text"
          ? { numFmt: NUM_FORMATS[c.format] }
          : {},
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    for (const row of spec.rows) sheet.addRow(row);
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
