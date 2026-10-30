// src/server/sales-control/export/write-cv-lines.ts
// Líneas del CV desde la fila 24 (ítems, filas de lote con subtotal y filas de nota) y los totales.
// Escribe fórmulas, no solo valores, para que el archivo siga "vivo" (ADR-12).
import type { Worksheet } from "exceljs";
import { numberItems } from "@/domain/sales-control/number-items";
import type {
  CvExportData,
  CvExportItem,
  CvExportSection,
} from "./cv-export-data";
import {
  FIRST_LINE_ROW,
  formula,
  insertRowCopies,
  toExcelNumber,
  writeCells,
} from "./excel-cells";

/** Columnas de la tabla de líneas, de Ítem (A) a PO# (O). */
const LAST_LINE_COLUMN = 15;

/** Escribe líneas y totales; devuelve cuántas filas se insertaron respecto de la plantilla. */
export function writeCvLines(ws: Worksheet, data: CvExportData): number {
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
      writeGroupRow(ws, row, section.groupName, section.rows.length);
      row += 1;
    }
    for (const line of section.rows) {
      if (line.kind === "NOTA") writeNoteRow(ws, row, line.text);
      else writeItemRow(ws, row, labels[index] ?? "", line, data.saleFxRate);
      if (line.color) fillRow(ws, row, line.color);
      row += 1;
      index += 1;
    }
  }
  writeTotals(ws, FIRST_LINE_ROW + rowCount - 1, data.costFxRate);
  return rowCount - 1;
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
  saleFxRate: string,
) {
  writeCells(ws.getRow(r), {
    // POR QUÉ: la principal va como número (como siempre); el subítem como texto, porque 1.10 sería 1.1.
    A: label.includes(".") ? label : Number(label),
    B: line.supplier,
    C: line.technology,
    D: line.code,
    E: line.description,
    F: toExcelNumber(line.quantity),
    G: toExcelNumber(line.unitCostUsd),
    // REGLA: montos half-up a 2 decimales por línea (AGENTS.md §15.4); ROUND de Excel redondea igual.
    H: formula(`ROUND(G${r}*F${r},2)`),
    I: toExcelNumber(line.unitSaleUsd),
    J: formula(`ROUND(I${r}*F${r},2)`),
    K: toExcelNumber(saleFxRate),
    L: formula(`ROUND(I${r}*K${r},2)`),
    M: formula(`ROUND(J${r}*K${r},2)`),
    N: line.observations,
    O: line.poNumber,
  });
}

function writeGroupRow(ws: Worksheet, r: number, name: string, size: number) {
  const row = ws.getRow(r);
  const range = (column: string) =>
    size > 0 ? formula(`SUM(${column}${r + 1}:${column}${r + size})`) : null;
  writeCells(row, { E: name, H: range("H"), J: range("J"), M: range("M") });
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { ...cell.font, bold: true };
  });
}

function writeNoteRow(ws: Worksheet, r: number, text: string) {
  const cell = ws.getRow(r).getCell("E");
  cell.value = text;
  cell.font = { ...cell.font, italic: true };
}

// TRAMPA: duplicateRow puede dejar el mismo objeto de estilo en varias celdas; se reemplaza el estilo de cada
// celda, nunca se muta, para no pintar otras filas.
function fillRow(ws: Worksheet, r: number, color: string) {
  const row = ws.getRow(r);
  for (let column = 1; column <= LAST_LINE_COLUMN; column++) {
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

function writeTotals(ws: Worksheet, last: number, costFxRate: string) {
  const total = last + 1;
  const items = (column: string) =>
    `${column}${FIRST_LINE_ROW}:${column}${last}`;
  // POR QUÉ: las filas de lote llevan subtotal; solo las filas con número de ítem (columna A, número o
  // «1.1» como texto) suman.
  const sumItems = (column: string) =>
    formula(`SUMIF(${items("A")},"<>",${items(column)})`);
  const withCost = (column: string) =>
    `SUMIFS(${items(column)},${items("A")},"<>",${items("H")},">0")`;
  writeCells(ws.getRow(total), {
    H: sumItems("H"),
    J: sumItems("J"),
    M: sumItems("M"),
    // REGLA: factor global sobre las líneas con costo > 0 (AGENTS.md §2.2).
    O: formula(`IFERROR(ROUND(${withCost("J")}/${withCost("H")},2),"")`),
  });
  writeCells(ws.getRow(total + 1), {
    // REGLA: Bs por línea redondeado y luego sumado (AGENTS.md §2.2).
    H: formula(
      `SUMPRODUCT((${items("A")}<>"")*ROUND(${items("H")}*${costFxRate},2))`,
    ),
    J: formula(`M${total}`),
  });
  writeCells(ws.getRow(22), {
    H: formula(`H${total}`),
    J: formula(`J${total}`),
  });
}
