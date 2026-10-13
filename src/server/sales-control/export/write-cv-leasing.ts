// src/server/sales-control/export/write-cv-leasing.ts
// Bloque de leasing o arrendamiento, desplazado según las filas de líneas insertadas. Tiene su propio
// total de costo y no afecta la venta (AGENTS.md §2.1).
import type { Worksheet } from "exceljs";
import type { CvExportLeasingLine } from "./cv-export-data";
import {
  formula,
  insertRowCopies,
  TEMPLATE_LEASING_ROWS,
  toExcelNumber,
  writeCells,
} from "./excel-cells";

const TEMPLATE_FIRST_LEASING_ROW = 31;

export function writeCvLeasing(
  ws: Worksheet,
  lines: CvExportLeasingLine[],
  shift: number,
): void {
  const first = TEMPLATE_FIRST_LEASING_ROW + shift;
  if (lines.length > TEMPLATE_LEASING_ROWS) {
    insertRowCopies(ws, first, lines.length - TEMPLATE_LEASING_ROWS);
  }
  const last = first + Math.max(lines.length, TEMPLATE_LEASING_ROWS) - 1;
  lines.forEach((line, index) => {
    const r = first + index;
    writeCells(ws.getRow(r), {
      A: index + 1,
      B: line.supplier,
      C: line.technology,
      D: line.code,
      E: line.description,
      F: toExcelNumber(line.quantity),
      G: toExcelNumber(line.unitCostUsd),
      H: formula(`ROUND(G${r}*F${r},2)`),
      I: line.notes,
      O: line.poNumber,
    });
  });
  writeCells(ws.getRow(last + 1), { H: formula(`SUM(H${first}:H${last})`) });
}
