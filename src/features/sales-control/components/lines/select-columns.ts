// src/features/sales-control/components/lines/select-columns.ts
// Columnas desplegables de la grilla del CV: de dónde salen sus opciones y qué cambia en la línea al elegir un
// valor. Lo usan la celda y «Aplicar a todas», para que las dos cambien la línea igual.
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { CvGridOptions, Option } from "../../types";
import {
  type ColumnKey,
  ITEM_TYPE_OPTIONS,
  SUPPLY_MODE_OPTIONS,
} from "./grid-columns";

export type SelectColumnKey =
  | "supplier"
  | "technology"
  | "area"
  | "unit"
  | "supplyMode"
  | "itemType";

type SelectColumn = {
  field: keyof CvLineDraft;
  items: (options: CvGridOptions) => Option[];
  patch: (value: string | null) => Partial<CvLineDraft>;
};

export const SELECT_COLUMNS: Record<SelectColumnKey, SelectColumn> = {
  supplier: {
    field: "supplierId",
    items: (o) => o.suppliers,
    patch: (supplierId) => ({ supplierId }),
  },
  technology: {
    field: "technologyId",
    items: (o) => o.technologies,
    patch: (technologyId) => ({ technologyId }),
  },
  area: {
    field: "areaId",
    items: (o) => o.areas,
    patch: (areaId) => ({ areaId }),
  },
  unit: {
    field: "unitId",
    items: (o) => o.units,
    patch: (unitId) => ({ unitId }),
  },
  supplyMode: {
    field: "supplyMode",
    items: () => SUPPLY_MODE_OPTIONS,
    patch: (value) => ({ supplyMode: value as CvLineDraft["supplyMode"] }),
  },
  itemType: {
    field: "itemType",
    items: () => ITEM_TYPE_OPTIONS,
    // REGLA: el rango de activación es solo de licencias; deja de valer si la línea cambia de tipo (§2.1).
    patch: (value) => ({
      itemType: value as CvLineDraft["itemType"],
      ...(value !== "INTANGIBLE" && { activationStart: "", activationEnd: "" }),
    }),
  },
};

export function isSelectColumn(key: ColumnKey): key is SelectColumnKey {
  return key in SELECT_COLUMNS;
}
