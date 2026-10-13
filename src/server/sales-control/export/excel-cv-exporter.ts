// src/server/sales-control/export/excel-cv-exporter.ts
// Adapter ExcelCvExporter: escribe una versión de CV sobre la plantilla oficial PA-PR-03-RE-01, hoja
// "CONTROL DE VENTAS V2", con fórmulas (ADR-12). La plantilla en blanco vive en templates/.
import path from "node:path";
import ExcelJS from "exceljs";
import type { CvExportData } from "./cv-export-data";
import { writeCvHeader } from "./write-cv-header";
import { writeCvLeasing } from "./write-cv-leasing";
import { writeCvLines } from "./write-cv-lines";

export const CV_TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "PA-PR-03-RE-01.xlsx",
);
const SHEET_NAME = "CONTROL DE VENTAS V2";

export async function exportCvToXlsx(
  data: CvExportData,
  templatePath = CV_TEMPLATE_PATH,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`La plantilla no tiene la hoja "${SHEET_NAME}".`);

  writeCvHeader(sheet, data);
  const shift = writeCvLines(sheet, data);
  writeCvLeasing(sheet, data.leasing, shift);
  // LIMITACIÓN: las fórmulas se guardan sin resultado; Excel las calcula al abrir. Un visor que no
  // calcula (vista previa de algunos clientes de correo) muestra esas celdas vacías.
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.creator = "Kraken by DIMA";
  workbook.lastModifiedBy = "Kraken by DIMA";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
