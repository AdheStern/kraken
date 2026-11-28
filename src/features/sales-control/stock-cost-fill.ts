// src/features/sales-control/stock-cost-fill.ts
// Propone como costo unitario de una línea «Stock DIMA» el costo promedio del producto en el almacén de la ciudad
// del CV (decisión 2026-11-28), solo cuando cambia su producto o su modalidad y el costo está vacío.
import type { CvLineDraft } from "./schemas/cv-lines-schema";

/** Costo promedio por id de producto, como texto con 2 decimales. */
export type StockCosts = ReadonlyMap<string, string>;

export const NO_STOCK_COSTS: StockCosts = new Map();

// POR QUÉ: se compara con la línea anterior para no volver a llenar el costo que el comercial acaba de borrar.
export function fillStockCosts(
  previous: CvLineDraft[],
  next: CvLineDraft[],
  costs: StockCosts,
): CvLineDraft[] {
  if (costs.size === 0) return next;
  const before = new Map(previous.map((line) => [line.key, line]));
  return next.map((line) => {
    const old = before.get(line.key);
    const changed =
      !old ||
      old.productId !== line.productId ||
      old.supplyMode !== line.supplyMode;
    const cost = line.productId ? costs.get(line.productId) : undefined;
    if (
      !changed ||
      !cost ||
      line.kind !== "ITEM" ||
      line.supplyMode !== "STOCK_DIMA" ||
      line.unitCostUsd.trim() !== ""
    )
      return line;
    return { ...line, unitCostUsd: cost };
  });
}
