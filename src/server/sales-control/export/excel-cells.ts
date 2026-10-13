// src/server/sales-control/export/excel-cells.ts
// Escritura de celdas de la exportación del CV: montos como número de Excel, fórmulas e inserción de filas.
import type { Cell, CellValue, Row, Worksheet } from "exceljs";

/** Fila 24 de la plantilla: la línea prototipo que se duplica por cada fila del CV. */
export const FIRST_LINE_ROW = 24;
/** Filas que la plantilla trae para las líneas de leasing (31 a 33) antes del total. */
export const TEMPLATE_LEASING_ROWS = 3;

// POR QUÉ: Excel solo guarda números de coma flotante; el monto llega como texto exacto con ≤ 2 decimales
// y se convierte recién aquí, al escribir la celda. Ningún cálculo de negocio usa este número.
export function toExcelNumber(text: string): number | null {
  return text === "" ? null : Number(text);
}

export function formula(expression: string): CellValue {
  return { formula: expression, date1904: false } as CellValue;
}

export function writeCells(row: Row, values: Record<string, CellValue>): void {
  for (const [column, value] of Object.entries(values)) {
    row.getCell(column).value = value === "" ? null : value;
  }
}

// TRAMPA: duplicateRow de ExcelJS desplaza valores y estilos pero pierde las notas de las filas movidas;
// las notas de ayuda de la plantilla (encabezado de leasing) se guardan y se reponen desplazadas.
export function insertRowCopies(
  ws: Worksheet,
  row: number,
  count: number,
): void {
  const notes: { row: number; column: number; note: Cell["note"] }[] = [];
  ws.eachRow({ includeEmpty: true }, (current, rowNumber) => {
    if (rowNumber <= row) return;
    current.eachCell({ includeEmpty: true }, (cell, column) => {
      if (cell.note) notes.push({ row: rowNumber, column, note: cell.note });
    });
  });
  ws.duplicateRow(row, count, true);
  for (const { row: from, column, note } of notes) {
    ws.getRow(from + count).getCell(column).note = note;
  }
}
