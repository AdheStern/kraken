// src/server/sales-control/export/excel-cv-exporter.ts
// Adapter ExcelCvExporter: escribe una versión de CV sobre el formulario PA-PR-03-RE-01 de DIMA, hoja
// "CONTROL DE VENTAS", con fórmulas (ADR-12). La plantilla en blanco vive en templates/.
import path from "node:path";
import ExcelJS from "exceljs";
import type { CvExportData } from "./cv-export-data";
import { toCvSheetLayout, WITHHOLDINGS_AT } from "./cv-sheet-layout";
import { dropEmptyNoteRuns } from "./excel-cells";
import { insertColumns } from "./insert-columns";
import { writeCvHeader } from "./write-cv-header";
import { writeCvLeasing } from "./write-cv-leasing";
import { writeCvLines } from "./write-cv-lines";

export const CV_TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "PA-PR-03-RE-01.xlsx",
);
const SHEET_NAME = "CONTROL DE VENTAS";
/** Desde esta fila empieza la tabla (fila de resumen y encabezados); arriba, la cabecera fija del formulario. */
const TABLE_FIRST_ROW = 22;
const HEADER_ROW = 23;
const YELLOW = "FFFFFF00";

export type CvExportOptions = {
  /** GROSS UP y RET DIMA no salen por defecto; se piden aparte (decisión 2026-11-25). */
  withWithholdings: boolean;
};

export async function exportCvToXlsx(
  data: CvExportData,
  options: CvExportOptions = { withWithholdings: false },
  templatePath = CV_TEMPLATE_PATH,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`La plantilla no tiene la hoja "${SHEET_NAME}".`);

  const layout = toCvSheetLayout(options.withWithholdings);
  if (options.withWithholdings) addWithholdingColumns(sheet);
  writeCvHeader(sheet, data);
  const shift = writeCvLines(sheet, data, layout);
  const lastRow = writeCvLeasing(sheet, data.leasing, shift, layout);
  sheet.pageSetup.printArea = `A1:${layout.poNumber}${lastRow}`;
  dropEmptyNoteRuns(sheet);
  // LIMITACIÓN: las fórmulas se guardan sin resultado; Excel las calcula al abrir. Un visor que no
  // calcula (vista previa de algunos clientes de correo) muestra esas celdas vacías.
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.creator = "Kraken by DIMA";
  workbook.lastModifiedBy = "Kraken by DIMA";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// REGLA: GROSS UP y RET DIMA van tras el costo total, con la cabecera en amarillo (decisión 2026-11-16); la franja
// del título se ensancha con la tabla.
function addWithholdingColumns(ws: ExcelJS.Worksheet): void {
  const at = WITHHOLDINGS_AT;
  const table = { at, count: 2, toRow: ws.rowCount };
  insertColumns(ws, {
    ...table,
    fromRow: TABLE_FIRST_ROW,
    styleFromRow: HEADER_ROW,
  });
  insertColumns(ws, {
    ...table,
    fromRow: 1,
    toRow: 3,
    styleFromRow: 1,
    keepWidths: true,
  });
  ["GROSS UP", "RET DIMA"].forEach((label, index) => {
    const cell = ws.getRow(HEADER_ROW).getCell(at + index);
    cell.value = label;
    cell.style = {
      ...cell.style,
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } },
    };
  });
}
