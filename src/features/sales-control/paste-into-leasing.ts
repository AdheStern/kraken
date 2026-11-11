// src/features/sales-control/paste-into-leasing.ts
// Pega un bloque copiado de Excel en la sección de leasing desde la celda enfocada, como en las líneas del CV:
// sobrescribe las filas siguientes y crea las que falten. En la versión aprobada solo escribe los datos posventa
// (notas, seriales y PO#) de las filas que ya existen (AGENTS.md §2.1 y §2.3, decisión 2026-11-11).
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";
import { matchCatalog } from "./match-catalog";
import type { CvLeasingLineDraft } from "./schemas/cv-leasing-schema";
import type { CvGridOptions } from "./types";

// REGLA: el orden de las columnas de la fila de leasing (`data-cell` fila:columna). El costo total (columna 6) es
// calculado: lo copiado de Excel lo trae y se salta.
const COLUMNS = [
  "supplier",
  "technology",
  "code",
  "description",
  "quantity",
  "unitCost",
  "total",
  "notes",
  "serials",
  "poNumber",
] as const;
type Column = (typeof COLUMNS)[number];
const POST_SALE: readonly Column[] = ["notes", "serials", "poNumber"];

type Options = Pick<CvGridOptions, "suppliers" | "technologies">;

export type LeasingPasteResult = {
  lines: CvLeasingLineDraft[];
  unmatched: string[];
  touched: number;
};

export function blankLeasingLine(): CvLeasingLineDraft {
  return {
    key: crypto.randomUUID(),
    id: null,
    supplierId: null,
    technologyId: null,
    code: "",
    description: "",
    quantity: "1",
    unitCostUsd: "",
    notes: "",
    serials: "",
    poNumber: "",
  };
}

export function pasteIntoLeasing(
  lines: CvLeasingLineDraft[],
  matrix: string[][],
  target: { row: number; col: number },
  options: Options,
  { postSaleOnly }: { postSaleOnly: boolean },
): LeasingPasteResult {
  const unmatched: string[] = [];
  const next = [...lines];
  const rows = postSaleOnly
    ? matrix.slice(0, Math.max(lines.length - target.row, 0))
    : matrix;
  rows.forEach((values, rowOffset) => {
    const index = target.row + rowOffset;
    let line = next[index] ?? blankLeasingLine();
    values.forEach((value, colOffset) => {
      const column = COLUMNS[target.col + colOffset];
      if (!column || value === "") return;
      if (postSaleOnly && !POST_SALE.includes(column)) return;
      line = applyCell(line, column, value, options, unmatched);
    });
    next[index] = line;
  });
  return { lines: next, unmatched, touched: rows.length };
}

function applyCell(
  line: CvLeasingLineDraft,
  column: Column,
  value: string,
  options: Options,
  unmatched: string[],
): CvLeasingLineDraft {
  const pick = (
    catalog: Options["suppliers"],
    label: string,
    current: string | null,
  ) => {
    const id = matchCatalog(catalog, value);
    if (!id) unmatched.push(`${label} «${value}»`);
    return id ?? current;
  };
  switch (column) {
    case "supplier":
      return {
        ...line,
        supplierId: pick(options.suppliers, "Proveedor", line.supplierId),
      };
    case "technology":
      return {
        ...line,
        technologyId: pick(options.technologies, "Línea", line.technologyId),
      };
    case "code":
      return { ...line, code: value };
    case "description":
      return { ...line, description: value };
    case "quantity":
      return { ...line, quantity: parseDecimalText(value) ?? value };
    case "unitCost":
      return { ...line, unitCostUsd: parseDecimalText(value) ?? value };
    case "notes":
      return { ...line, notes: value };
    case "serials":
      return { ...line, serials: value };
    case "poNumber":
      return { ...line, poNumber: value };
    case "total":
      return line;
  }
}
