// src/features/sales-control/paste-into-lines.ts
// Pega un bloque copiado de Excel en la grilla desde la celda enfocada, como en una planilla: sobrescribe
// las líneas siguientes del mismo lote y crea las que falten. Reconoce catálogos por código o nombre.
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";
import {
  type ColumnKey,
  ITEM_TYPE_OPTIONS,
  SUPPLY_MODE_OPTIONS,
} from "./components/lines/grid-columns";
import { fillFromProduct } from "./product-fill";
import type { CvGroupDraft, CvLineDraft } from "./schemas/cv-lines-schema";
import type { CvGridOptions } from "./types";

type State = { groups: CvGroupDraft[]; lines: CvLineDraft[] };
type Catalog = { id: string; label: string; hint?: string }[];

export type PasteResult = {
  lines: CvLineDraft[];
  unmatched: string[];
  touched: number;
};

export function pasteIntoLines(
  state: State,
  matrix: string[][],
  target: { lineKey: string; column: ColumnKey },
  columns: ColumnKey[],
  options: CvGridOptions,
  newLine: (groupKey: string | null) => CvLineDraft,
): PasteResult {
  const start = state.lines.findIndex((line) => line.key === target.lineKey);
  if (start < 0) return { lines: state.lines, unmatched: [], touched: 0 };
  const groupKey = state.lines[start].groupKey;
  const sectionTail = state.lines
    .slice(start)
    .filter((line) => line.groupKey === groupKey);
  const firstColumn = columns.indexOf(target.column);
  const unmatched: string[] = [];
  const updated = new Map<string, CvLineDraft>();
  const created: CvLineDraft[] = [];

  matrix.forEach((values, rowOffset) => {
    const existing = sectionTail[rowOffset];
    let line = existing ?? newLine(groupKey);
    values.forEach((value, colOffset) => {
      const column = columns[firstColumn + colOffset];
      if (column && value !== "")
        line = applyCell(line, column, value, options, unmatched);
    });
    if (existing) updated.set(line.key, line);
    else created.push(line);
  });

  const lines = state.lines.map((line) => updated.get(line.key) ?? line);
  const insertAt = state.lines.indexOf(sectionTail[sectionTail.length - 1]) + 1;
  lines.splice(insertAt, 0, ...created);
  return { lines, unmatched, touched: matrix.length };
}

function applyCell(
  line: CvLineDraft,
  column: ColumnKey,
  value: string,
  options: CvGridOptions,
  unmatched: string[],
): CvLineDraft {
  if (line.kind === "NOTA")
    return column === "description" ? { ...line, description: value } : line;
  const number = () => parseDecimalText(value) ?? value;
  const pick = (catalog: Catalog, label: string) => {
    const id = matchCatalog(catalog, value);
    if (!id) unmatched.push(`${label} «${value}»`);
    return id;
  };
  switch (column) {
    case "code": {
      const product = options.products.find(
        (p) => p.code.toUpperCase() === value.toUpperCase(),
      );
      return product
        ? fillFromProduct(line, product)
        : { ...line, code: value, productId: null };
    }
    case "description":
      return { ...line, description: value };
    case "poNumber":
      return { ...line, poNumber: value };
    case "notes":
      return { ...line, notes: value };
    case "quantity":
      return { ...line, quantity: number() };
    case "unitCost":
      return { ...line, unitCostUsd: number() };
    case "factor": {
      const factor =
        parseDecimalText(value, { allowThousands: false }) ?? value;
      return { ...line, pricingSource: "FACTOR", factor };
    }
    case "unitSale":
      return { ...line, pricingSource: "PRECIO", unitSaleUsd: number() };
    case "area":
      return { ...line, areaId: pick(options.areas, "Área") ?? line.areaId };
    case "unit":
      return { ...line, unitId: pick(options.units, "Unidad") ?? line.unitId };
    case "supplier":
      return {
        ...line,
        supplierId: pick(options.suppliers, "Proveedor") ?? line.supplierId,
      };
    case "technology":
      return {
        ...line,
        technologyId:
          pick(options.technologies, "Tecnología") ?? line.technologyId,
      };
    case "supplyMode": {
      const id = pick(
        SUPPLY_MODE_OPTIONS,
        "Modalidad",
      ) as CvLineDraft["supplyMode"];
      return { ...line, supplyMode: id ?? line.supplyMode };
    }
    case "itemType": {
      const id = pick(ITEM_TYPE_OPTIONS, "Tipo") as CvLineDraft["itemType"];
      return { ...line, itemType: id ?? line.itemType };
    }
    default:
      return line;
  }
}

// POR QUÉ: en las planillas el mismo valor llega como código, nombre o con otra capitalización.
function matchCatalog(catalog: Catalog, value: string): string | null {
  const wanted = normalize(value);
  const found = catalog.find((option) =>
    [option.id, option.label, option.hint].some(
      (candidate) => candidate && normalize(candidate) === wanted,
    ),
  );
  return found?.id ?? null;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();
}
