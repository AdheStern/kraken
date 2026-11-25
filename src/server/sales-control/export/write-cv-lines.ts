// src/server/sales-control/export/write-cv-lines.ts
// Líneas del CV desde la fila 24 (ítems, filas de lote con subtotal y filas de nota), en las columnas del
// formulario de DIMA (CvSheetLayout). Escribe fórmulas, no solo valores, para que el archivo siga "vivo" (ADR-12).
import type { CellValue, Worksheet } from "exceljs";
import { numberItems } from "@/domain/sales-control/number-items";
import type {
  CvExportData,
  CvExportItem,
  CvExportSection,
} from "./cv-export-data";
import type { CvSheetLayout } from "./cv-sheet-layout";
import {
  FIRST_LINE_ROW,
  formula,
  insertRowCopies,
  toExcelNumber,
  writeCells,
} from "./excel-cells";
import { writeCvTotals } from "./write-cv-totals";

/** Escribe líneas y totales; devuelve cuántas filas se insertaron respecto de la plantilla. */
export function writeCvLines(
  ws: Worksheet,
  data: CvExportData,
  layout: CvSheetLayout,
): number {
  const rowCount = Math.max(
    1,
    data.sections.reduce((sum, s) => sum + sectionSize(s), 0),
  );
  if (rowCount > 1) insertRowCopies(ws, FIRST_LINE_ROW, rowCount - 1);

  const labels = itemLabels(data.sections);
  let row = FIRST_LINE_ROW;
  let index = 0;
  for (const section of data.sections) {
    if (section.groupName !== null) {
      writeGroupRow(ws, row, section, layout);
      row += 1;
    }
    for (const line of section.rows) {
      if (line.kind === "NOTA") writeNoteRow(ws, row, line.text, layout);
      else writeItemRow(ws, row, labels[index] ?? "", line, data, layout);
      if (line.color) fillRow(ws, row, line.color, layout.lastColumn);
      row += 1;
      index += 1;
    }
  }
  const added = writeCvTotals(ws, FIRST_LINE_ROW + rowCount - 1, data, layout);
  return rowCount - 1 + added;
}

function itemLabels(sections: CvExportSection[]): (string | null)[] {
  return numberItems(
    sections.flatMap((section, sectionIndex) =>
      section.rows.map((line) => ({
        kind: line.kind,
        isSubItem: line.kind === "ITEM" && line.isSubItem,
        sectionKey: String(sectionIndex),
      })),
    ),
  ).labels;
}

function sectionSize(section: CvExportSection): number {
  return section.rows.length + (section.groupName === null ? 0 : 1);
}

function writeItemRow(
  ws: Worksheet,
  r: number,
  label: string,
  line: CvExportItem,
  data: CvExportData,
  c: CvSheetLayout,
) {
  const values: Record<string, CellValue> = {
    // POR QUÉ: la principal va como número (como siempre); el subítem como texto, porque 1.10 sería 1.1.
    [c.item]: label.includes(".") ? label : Number(label),
    [c.supplier]: line.supplier,
    [c.technology]: line.technology,
    [c.bc]: line.bc,
    [c.code]: line.code,
    [c.description]: line.description,
    [c.quantity]: toExcelNumber(line.quantity),
    [c.unitCost]: toExcelNumber(line.unitCostUsd),
    // REGLA: montos half-up a 2 decimales por línea (AGENTS.md §15.4); ROUND de Excel redondea igual.
    [c.totalCost]: formula(`ROUND(${c.unitCost}${r}*${c.quantity}${r},2)`),
    [c.unitSale]: toExcelNumber(line.unitSaleUsd),
    [c.totalSale]: formula(`ROUND(${c.unitSale}${r}*${c.quantity}${r},2)`),
    [c.fxRate]: toExcelNumber(data.saleFxRate),
    [c.unitSaleBs]: formula(`ROUND(${c.unitSale}${r}*${c.fxRate}${r},2)`),
    [c.totalSaleBs]: formula(`ROUND(${c.totalSale}${r}*${c.fxRate}${r},2)`),
    [c.observations]: line.observations,
    [c.poNumber]: line.poNumber,
  };
  if (c.grossUp) values[c.grossUp] = toExcelNumber(line.grossUpUsd);
  if (c.retDima) values[c.retDima] = toExcelNumber(line.retDimaUsd);
  writeCells(ws.getRow(r), values);
}

function writeGroupRow(
  ws: Worksheet,
  r: number,
  section: CvExportSection,
  c: CvSheetLayout,
) {
  const row = ws.getRow(r);
  const size = section.rows.length;
  const values: Record<string, CellValue> = {
    [c.description]: section.groupName ?? "",
  };
  const amounts = [
    c.totalCost,
    c.grossUp,
    c.retDima,
    c.totalSale,
    c.totalSaleBs,
  ];
  for (const column of amounts) {
    if (column && size > 0) {
      values[column] = formula(`SUM(${column}${r + 1}:${column}${r + size})`);
    }
  }
  writeCells(row, values);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { ...cell.font, bold: true };
  });
}

function writeNoteRow(
  ws: Worksheet,
  r: number,
  text: string,
  c: CvSheetLayout,
) {
  const cell = ws.getRow(r).getCell(c.description);
  cell.value = text;
  cell.font = { ...cell.font, italic: true };
}

// TRAMPA: duplicateRow puede dejar el mismo objeto de estilo en varias celdas; se reemplaza el estilo de cada
// celda, nunca se muta, para no pintar otras filas.
function fillRow(ws: Worksheet, r: number, color: string, lastColumn: number) {
  const row = ws.getRow(r);
  for (let column = 1; column <= lastColumn; column++) {
    const cell = row.getCell(column);
    cell.style = {
      ...cell.style,
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${color}` },
      },
    };
  }
}
