// src/server/sales-control/export/write-cv-totals.ts
// Totales bajo las líneas del CV, la fila 22 sobre los encabezados (proveedor, línea principal y totales, como el
// formulario de DIMA) y, si lo hay, el precio final (AGENTS.md §2.3 y §5).
import type { Cell, Worksheet } from "exceljs";
import type { CvExportData } from "./cv-export-data";
import type { CvSheetLayout } from "./cv-sheet-layout";
import {
  FIRST_LINE_ROW,
  formula,
  insertRowCopies,
  toExcelNumber,
  writeCells,
} from "./excel-cells";

/** Fila de resumen sobre los encabezados de la tabla. */
const SUMMARY_ROW = 22;
/** Filas que agrega el precio final bajo los totales: el precio final y el ajuste frente al calculado. */
const FINAL_PRICE_ROWS = 2;

/** Escribe totales y la fila 22; devuelve cuántas filas agregó el precio final. */
export function writeCvTotals(
  ws: Worksheet,
  last: number,
  data: CvExportData,
  c: CvSheetLayout,
): number {
  const total = last + 1;
  const items = (column: string) =>
    `${column}${FIRST_LINE_ROW}:${column}${last}`;
  // POR QUÉ: las filas de lote llevan subtotal; solo las filas con número de ítem (número o «1.1») suman.
  const sumItems = (column: string) =>
    formula(`SUMIF(${items(c.item)},"<>",${items(column)})`);
  const withCost = (column: string) =>
    `SUMIFS(${items(column)},${items(c.item)},"<>",${items(c.totalCost)},">0")`;
  const totals: Record<string, ReturnType<typeof formula>> = {
    [c.totalCost]: sumItems(c.totalCost),
    [c.totalSale]: sumItems(c.totalSale),
    [c.totalSaleBs]: sumItems(c.totalSaleBs),
    // REGLA: factor global sobre las líneas con costo > 0 (AGENTS.md §2.2).
    [c.poNumber]: formula(
      `IFERROR(ROUND(${withCost(c.totalSale)}/${withCost(c.totalCost)},2),"")`,
    ),
  };
  if (c.grossUp) totals[c.grossUp] = sumItems(c.grossUp);
  if (c.retDima) totals[c.retDima] = sumItems(c.retDima);
  writeCells(ws.getRow(total), totals);
  labelFactor(ws.getRow(total).getCell(c.observations));
  writeCells(ws.getRow(total + 1), {
    // REGLA: Bs por línea redondeado y luego sumado (AGENTS.md §2.2).
    [c.totalCost]: formula(
      `SUMPRODUCT((${items(c.item)}<>"")*ROUND(${items(c.totalCost)}*${data.costFxRate},2))`,
    ),
    [c.totalSale]: formula(`${c.totalSaleBs}${total}`),
  });
  const saleRow = data.finalPrice ? total + 2 : total;
  writeCells(ws.getRow(SUMMARY_ROW), {
    [c.supplier]: singleSupplier(data),
    [c.technology]: data.mainTechnology,
    [c.totalCost]: formula(`${c.totalCost}${total}`),
    [c.totalSale]: formula(`${c.totalSale}${saleRow}`),
  });
  if (!data.finalPrice) return 0;
  writeFinalPrice(ws, total, data.finalPrice, data.saleFxRate, c);
  return FINAL_PRICE_ROWS;
}

// POR QUÉ: el factor va bajo el PO# (como en el formulario); la etiqueta a su izquierda dice qué es.
function labelFactor(cell: Cell): void {
  cell.value = "FACTOR:";
  cell.style = {
    ...cell.style,
    font: { ...cell.font, bold: true },
    alignment: { ...cell.alignment, horizontal: "right" },
  };
}

// POR QUÉ: el formulario muestra un proveedor sobre la tabla; con varios no hay uno que represente al CV.
function singleSupplier(data: CvExportData): string {
  const suppliers = new Set(
    data.sections.flatMap((section) =>
      section.rows.flatMap((line) =>
        line.kind === "ITEM" && line.supplier ? [line.supplier] : [],
      ),
    ),
  );
  return suppliers.size === 1 ? ([...suppliers][0] ?? "") : "";
}

// REGLA: el precio final es un dato ingresado (valor, no fórmula); con solo USD los Bs salen del TC de venta y con
// solo Bs el USD es el calculado. El ajuste es la diferencia con el total de las líneas (decisión 2026-11-19).
function writeFinalPrice(
  ws: Worksheet,
  total: number,
  price: NonNullable<CvExportData["finalPrice"]>,
  saleFxRate: string,
  c: CvSheetLayout,
) {
  const final = total + 2;
  insertRowCopies(ws, total + 1, FINAL_PRICE_ROWS);
  const usd = price.saleUsd
    ? toExcelNumber(price.saleUsd)
    : formula(`${c.totalSale}${total}`);
  const bs = price.saleBs
    ? toExcelNumber(price.saleBs)
    : formula(`ROUND(${c.totalSale}${final}*${saleFxRate},2)`);
  // POR QUÉ: las dos filas son copias de la de Bs; se vacían su costo en Bs y su etiqueta «Bs.».
  const cleared = { [c.totalCost]: "", [c.unitSale]: "" };
  writeCells(ws.getRow(final), {
    ...cleared,
    [c.unitCost]: "PRECIO FINAL $us:",
    [c.totalSale]: usd,
    [c.totalSaleBs]: bs,
  });
  writeCells(ws.getRow(final + 1), {
    ...cleared,
    [c.unitCost]: "AJUSTE:",
    [c.totalSale]: formula(`${c.totalSale}${final}-${c.totalSale}${total}`),
    [c.totalSaleBs]: formula(
      `${c.totalSaleBs}${final}-${c.totalSaleBs}${total}`,
    ),
  });
}
