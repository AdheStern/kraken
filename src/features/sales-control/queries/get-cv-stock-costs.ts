// src/features/sales-control/queries/get-cv-stock-costs.ts
// Costo promedio de cada producto con stock en el almacén físico de la ciudad del CV, para proponerlo como costo
// de sus líneas «Stock DIMA» (decisión 2026-11-28; AGENTS.md §2.8: la excepción de costos de inventario en el CV).
import Decimal from "decimal.js";
import { averageUnitCostUsd } from "@/domain/inventory/stock-valuation";
import type { SessionUser } from "@/server/authz/roles";
import { scopeStockQuery } from "@/server/authz/scope-stock-query";
import { prisma } from "@/server/db";

// REGLA: solo se llama para quien edita el borrador y ve sus costos (regla 12); el resto recibe un objeto vacío.
export async function getCvStockCosts(
  user: SessionUser,
  cvId: string,
): Promise<Record<string, string>> {
  const cv = await prisma.cv.findUnique({
    where: { id: cvId },
    select: { cityId: true },
  });
  if (!cv) return {};
  const stocks = await prisma.stock.findMany({
    where: {
      AND: [
        scopeStockQuery(user),
        { quantity: { gt: 0 } },
        { warehouse: { kind: "FISICO", isActive: true, cityId: cv.cityId } },
      ],
    },
    select: { productId: true, quantity: true, valueUsd: true },
  });
  const costs: Record<string, string> = {};
  for (const stock of stocks) {
    const average = averageUnitCostUsd({
      quantity: new Decimal(stock.quantity.toString()),
      valueUsd: new Decimal(stock.valueUsd.toString()),
    });
    if (average) costs[stock.productId] = average.toFixed(2);
  }
  return costs;
}
