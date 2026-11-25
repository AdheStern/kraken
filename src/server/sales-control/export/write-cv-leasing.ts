// src/server/sales-control/export/write-cv-leasing.ts
// Bloque de leasing o arrendamiento, desplazado según las filas de líneas insertadas. Tiene su propio
// total de costo y no afecta la venta (AGENTS.md §2.1). No lleva BC: su columna queda vacía.
import type { Worksheet } from "exceljs";
import type { CvExportLeasingLine } from "./cv-export-data";
import type { CvSheetLayout } from "./cv-sheet-layout";
import {
  formula,
  insertRowCopies,
  TEMPLATE_LEASING_ROWS,
  toExcelNumber,
  writeCells,
} from "./excel-cells";

const TEMPLATE_FIRST_LEASING_ROW = 31;

/** Escribe el leasing; devuelve el número de su fila de total, la última de la hoja. */
export function writeCvLeasing(
  ws: Worksheet,
  lines: CvExportLeasingLine[],
  shift: number,
  c: CvSheetLayout,
): number {
  const first = TEMPLATE_FIRST_LEASING_ROW + shift;
  if (lines.length > TEMPLATE_LEASING_ROWS) {
    insertRowCopies(ws, first, lines.length - TEMPLATE_LEASING_ROWS);
  }
  const last = first + Math.max(lines.length, TEMPLATE_LEASING_ROWS) - 1;
  lines.forEach((line, index) => {
    const r = first + index;
    writeCells(ws.getRow(r), {
      [c.item]: index + 1,
      [c.supplier]: line.supplier,
      [c.technology]: line.technology,
      [c.code]: line.code,
      [c.description]: line.description,
      [c.quantity]: toExcelNumber(line.quantity),
      [c.unitCost]: toExcelNumber(line.unitCostUsd),
      [c.totalCost]: formula(`ROUND(${c.unitCost}${r}*${c.quantity}${r},2)`),
      // POR QUÉ: el formulario titula «NOTAS» las columnas de la venta, que el leasing no tiene.
      [c.unitSale]: line.notes,
      [c.poNumber]: line.poNumber,
    });
  });
  writeCells(ws.getRow(last + 1), {
    [c.totalCost]: formula(`SUM(${c.totalCost}${first}:${c.totalCost}${last})`),
  });
  return last + 1;
}
