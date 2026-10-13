// src/features/sales-control/components/lines/grid-columns.ts
// Columnas de la grilla de líneas.
// POR QUÉ: precio y totales van junto a la descripción para verse sin desplazar; la clasificación
// (proveedor, modalidad, tecnología, tipo) queda a la derecha. El Excel exportado sigue su propia plantilla.
import type { ItemType, SupplyMode } from "@/generated/prisma/enums";

export type GridColumn = {
  label: string;
  width: number;
  align?: "right";
  costOnly?: boolean;
};

export const COLUMNS = {
  index: { label: "#", width: 44 },
  area: { label: "Área", width: 104 },
  code: { label: "Código", width: 124 },
  description: { label: "Descripción", width: 248 },
  unit: { label: "Unidad", width: 92 },
  quantity: { label: "Cant.", width: 76, align: "right" },
  unitCost: {
    label: "Costo unit.",
    width: 108,
    align: "right",
    costOnly: true,
  },
  factor: { label: "Factor", width: 104, align: "right", costOnly: true },
  unitSale: { label: "Venta unit.", width: 112, align: "right" },
  totalCost: {
    label: "Costo total",
    width: 112,
    align: "right",
    costOnly: true,
  },
  totalSale: { label: "Venta total", width: 116, align: "right" },
  supplier: { label: "Proveedor", width: 150 },
  supplyMode: { label: "Modalidad", width: 128 },
  technology: { label: "Tecnología", width: 120 },
  itemType: { label: "Tipo", width: 112 },
  poNumber: { label: "PO#", width: 100 },
  notes: { label: "Observaciones", width: 200 },
  actions: { label: "", width: 124 },
} as const satisfies Record<string, GridColumn>;

export type ColumnKey = keyof typeof COLUMNS;

export const COLUMN_KEYS = Object.keys(COLUMNS) as ColumnKey[];

export function visibleColumns(canSeeCosts: boolean): ColumnKey[] {
  return COLUMN_KEYS.filter(
    (key) => canSeeCosts || !("costOnly" in COLUMNS[key]),
  );
}

export const SUPPLY_MODE_OPTIONS: { id: SupplyMode; label: string }[] = [
  { id: "LOCAL", label: "Local" },
  { id: "IMPORTACION", label: "Importación" },
  { id: "STOCK_DIMA", label: "Stock DIMA" },
  { id: "SERVICIO_PROPIO", label: "Servicio propio" },
];

export const ITEM_TYPE_OPTIONS: { id: ItemType; label: string }[] = [
  { id: "HARDWARE", label: "Hardware" },
  { id: "INTANGIBLE", label: "Intangible" },
  { id: "SERVICIO", label: "Servicio" },
];
