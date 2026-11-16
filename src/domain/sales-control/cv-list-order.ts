// src/domain/sales-control/cv-list-order.ts
// Orden y ventana de página del listado de CV: ordena por la columna elegida (desempate por número de CV)
// y acota la página pedida a las que existen.
import Decimal from "decimal.js";

export const CV_SORT_KEYS = [
  "codigo",
  "titulo",
  "cliente",
  "estado",
  "venta",
  "actualizado",
] as const;
export type CvSortKey = (typeof CV_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";
export type CvSort = { key: CvSortKey; direction: SortDirection };

export const DEFAULT_CV_SORT: CvSort = { key: "codigo", direction: "desc" };

// POR QUÉ: el estado se ordena por el ciclo de la versión, no alfabéticamente.
const STATUS_ORDER = [
  "BORRADOR",
  "EN_APROBACION",
  "OBSERVADA",
  "APROBADA",
  "REEMPLAZADA",
  "ANULADA",
];

export type CvSortFacts = {
  year: number;
  number: number;
  cityCode: string;
  title: string;
  customerName: string;
  status: string;
  totalSaleUsd: string;
  updatedAt: Date;
};

export function sortCvList<T extends CvSortFacts>(
  rows: T[],
  sort: CvSort,
): T[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort(
    (a, b) => sign * compareBy(sort.key, a, b) || sign * compareCode(a, b) || 0,
  );
}

export type PageWindow = {
  page: number;
  pageCount: number;
  start: number;
  end: number;
};

export function toPageWindow(
  total: number,
  requestedPage: number,
  pageSize: number,
): PageWindow {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, start, end: Math.min(start + pageSize, total) };
}

const collator = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

function compareBy(key: CvSortKey, a: CvSortFacts, b: CvSortFacts): number {
  switch (key) {
    case "codigo":
      return compareCode(a, b);
    case "titulo":
      return collator.compare(a.title, b.title);
    case "cliente":
      return collator.compare(a.customerName, b.customerName);
    case "estado":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    case "venta":
      return new Decimal(a.totalSaleUsd).comparedTo(b.totalSaleUsd);
    case "actualizado":
      return a.updatedAt.getTime() - b.updatedAt.getTime();
  }
}

// REGLA: el número es {correlativo}{ciudad}-{aa}; se ordena por año, correlativo y ciudad (§2.1).
function compareCode(a: CvSortFacts, b: CvSortFacts): number {
  return (
    a.year - b.year ||
    a.number - b.number ||
    collator.compare(a.cityCode, b.cityCode)
  );
}
