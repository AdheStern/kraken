// src/server/sales-control/export/cv-sheet-layout.ts
// Columnas de la tabla de líneas de la hoja «CONTROL DE VENTAS»: las del formulario de DIMA (como el CV 085LP-26)
// más BC, y GROSS UP y RET DIMA tras el costo total solo si se piden (AGENTS.md §5, decisión 2026-11-25).

const BASE_COLUMNS = [
  "item",
  "supplier",
  "technology",
  "bc",
  "code",
  "description",
  "quantity",
  "unitCost",
  "totalCost",
  "unitSale",
  "totalSale",
  "fxRate",
  "unitSaleBs",
  "totalSaleBs",
  "observations",
  "poNumber",
] as const;
const WITHHOLDING_COLUMNS = ["grossUp", "retDima"] as const;

type BaseColumn = (typeof BASE_COLUMNS)[number];
type WithholdingColumn = (typeof WITHHOLDING_COLUMNS)[number];

export type CvSheetLayout = Record<BaseColumn, string> &
  Record<WithholdingColumn, string | null> & {
    /** Número de la última columna de la tabla (PO#). */
    lastColumn: number;
  };

/** Columna (número) donde entran GROSS UP y RET DIMA: la que sigue al costo total. */
export const WITHHOLDINGS_AT = BASE_COLUMNS.indexOf("totalCost") + 2;

export function toCvSheetLayout(withWithholdings: boolean): CvSheetLayout {
  const keys: (BaseColumn | WithholdingColumn)[] = [...BASE_COLUMNS];
  if (withWithholdings)
    keys.splice(WITHHOLDINGS_AT - 1, 0, ...WITHHOLDING_COLUMNS);
  const letters = Object.fromEntries(
    keys.map((key, index) => [key, String.fromCharCode(65 + index)]),
  );
  return {
    ...(letters as Record<BaseColumn, string>),
    grossUp: letters.grossUp ?? null,
    retDima: letters.retDima ?? null,
    lastColumn: keys.length,
  };
}
