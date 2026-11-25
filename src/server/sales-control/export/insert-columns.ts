// src/server/sales-control/export/insert-columns.ts
// Inserta columnas vacías en un tramo de filas de la hoja del CV: corre celdas, notas, anchos y celdas combinadas.
// Lo usa la exportación para sumar GROSS UP y RET DIMA a la tabla de líneas (AGENTS.md §5).
import type { Cell, Row, Worksheet } from "exceljs";

type InsertColumns = {
  /** Número de la primera columna nueva (J = 10). */
  at: number;
  count: number;
  fromRow: number;
  toRow: number;
  /** Desde esta fila las columnas nuevas copian el estilo de la columna de su izquierda. */
  styleFromRow: number;
  /** La franja del título (filas 1 a 3) se ensancha sin tocar los anchos de las columnas. */
  keepWidths?: boolean;
};

type Merge = { top: number; left: number; bottom: number; right: number };

// TRAMPA: spliceColumns de ExcelJS corre toda la hoja y no mueve las celdas combinadas; aquí se corre solo el
// tramo pedido y las combinadas de ese tramo se deshacen y se rehacen desplazadas o ensanchadas.
export function insertColumns(ws: Worksheet, options: InsertColumns): void {
  const { at, count, fromRow, toRow, styleFromRow, keepWidths } = options;
  const merges = takeMerges(ws, fromRow, toRow);
  for (let r = fromRow; r <= toRow; r++) {
    const row = ws.getRow(r);
    row.splice(at, 0, ...Array<null>(count).fill(null));
    if (r >= styleFromRow) copyLeftStyle(row, at, count);
  }
  // REGLA: una combinada que empieza en la columna insertada o a su derecha se corre; una que la contiene se
  // ensancha; las de la izquierda no cambian.
  for (const merge of merges) {
    const left = merge.left >= at ? merge.left + count : merge.left;
    const right = merge.right >= at ? merge.right + count : merge.right;
    ws.mergeCellsWithoutStyle(merge.top, left, merge.bottom, right);
  }
  if (!keepWidths) shiftColumnWidths(ws, at, count);
}

function takeMerges(ws: Worksheet, fromRow: number, toRow: number): Merge[] {
  const merges = ws.model.merges
    .map((range) => toMerge(ws, range))
    .filter((merge) => merge.top >= fromRow && merge.bottom <= toRow);
  // TRAMPA: unMergeCells deja sin estilo las celdas secundarias y se pierden los bordes del recuadro.
  for (const merge of merges) {
    const styles = mergeCells(ws, merge).map((cell) => ({
      cell,
      style: cell.style,
    }));
    ws.unMergeCells(merge.top, merge.left, merge.bottom, merge.right);
    for (const { cell, style } of styles) cell.style = { ...style };
  }
  return merges;
}

function toMerge(ws: Worksheet, range: string): Merge {
  const [from, to = from] = range.split(":");
  const tl = ws.getCell(from ?? "A1");
  const br = ws.getCell(to ?? "A1");
  return {
    top: Number(tl.row),
    left: Number(tl.col),
    bottom: Number(br.row),
    right: Number(br.col),
  };
}

function mergeCells(ws: Worksheet, merge: Merge): Cell[] {
  const cells: Cell[] = [];
  for (let r = merge.top; r <= merge.bottom; r++) {
    for (let c = merge.left; c <= merge.right; c++)
      cells.push(ws.getCell(r, c));
  }
  return cells;
}

function copyLeftStyle(row: Row, at: number, count: number): void {
  const style = row.getCell(at - 1).style;
  for (let c = at; c < at + count; c++) row.getCell(c).style = { ...style };
}

function shiftColumnWidths(ws: Worksheet, at: number, count: number): void {
  const last = ws.columnCount + count;
  for (let c = last; c >= at + count; c--) {
    ws.getColumn(c).width = ws.getColumn(c - count).width;
  }
  for (let c = at; c < at + count; c++) {
    ws.getColumn(c).width = ws.getColumn(at - 1).width;
  }
}
