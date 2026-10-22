// src/domain/dashboards/inventory-kpis.ts
// Valor del inventario a una fecha, reconstruido del libro, y rotación del periodo (AGENTS.md §2.8 y §6).
import Decimal from "decimal.js";
import { roundHalfUp2 } from "../pricing/money";

// POR QUÉ: cada línea del libro guarda el saldo valorizado de su stock tras ella; el último antes de una fecha
// es el valor de ese stock en esa fecha.
export type StockBalancePoint = {
  stockKey: string;
  at: Date;
  balanceValueUsd: Decimal;
};

// REGLA: los puntos llegan en el orden del libro (fecha y luego línea); dentro de un mismo instante gana el último.
export function stockValueAt(
  points: readonly StockBalancePoint[],
  instant: Date,
): Decimal {
  const latest = new Map<string, Decimal>();
  for (const point of points) {
    if (point.at >= instant) continue;
    latest.set(point.stockKey, point.balanceValueUsd);
  }
  return [...latest.values()].reduce(
    (acc, value) => acc.plus(value),
    new Decimal(0),
  );
}

// Rotación = valor que salió en el periodo ÷ valor promedio ((inicio + fin) / 2). Sin inventario no hay rotación.
export function inventoryTurnover(
  outboundValueUsd: Decimal,
  openingValueUsd: Decimal,
  closingValueUsd: Decimal,
): Decimal | null {
  const average = openingValueUsd.plus(closingValueUsd).dividedBy(2);
  if (!average.greaterThan(0)) return null;
  return roundHalfUp2(outboundValueUsd.dividedBy(average));
}
