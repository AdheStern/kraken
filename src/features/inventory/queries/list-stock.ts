// src/features/inventory/queries/list-stock.ts
// Stock de un almacén con lo reservado y lo disponible, buscable por código, descripción o serial
// (AGENTS.md §2.8, §2.9). Valor y promedio solo para quien ve costos: a los demás no se les seleccionan.
import Decimal from "decimal.js";
import { averageUnitCostUsd } from "@/domain/inventory/stock-valuation";
import { canSeeInventoryCosts } from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeStockQuery } from "@/server/authz/scope-stock-query";
import { prisma } from "@/server/db";
import type { StockRow } from "../types";

// LIMITACIÓN: hasta 1000 productos por almacén; más allá hay que buscar.
const MAX_ROWS = 1000;

type Filter = { warehouseId: string; isTransit: boolean; search: string };

export async function listStock(
  user: SessionUser,
  { warehouseId, isTransit, search }: Filter,
): Promise<StockRow[]> {
  const showCosts = canSeeInventoryCosts(user);
  const q = search.trim();
  const text = { contains: q, mode: "insensitive" as const };
  const rows = await prisma.stock.findMany({
    where: {
      AND: [
        scopeStockQuery(user),
        { warehouseId },
        { OR: [{ quantity: { gt: 0 } }, { reservedQuantity: { gt: 0 } }] },
        q
          ? {
              product: {
                OR: [
                  { code: text },
                  { description: text },
                  { serialUnits: { some: { warehouseId, serial: text } } },
                ],
              },
            }
          : {},
      ],
    },
    orderBy: { product: { code: "asc" } },
    take: MAX_ROWS,
    select: {
      quantity: true,
      reservedQuantity: true,
      valueUsd: showCosts,
      product: {
        select: { id: true, code: true, description: true, isSerialized: true },
      },
    },
  });
  return rows.map((row) => {
    const quantity = new Decimal(row.quantity.toString());
    const reserved = new Decimal(row.reservedQuantity.toString());
    const value = showCosts ? new Decimal(row.valueUsd.toString()) : null;
    // POR QUÉ: el promedio de TRANSITO mezcla traspasos de orígenes distintos; no significa nada (§2.8).
    const average =
      value && !isTransit
        ? averageUnitCostUsd({ quantity, valueUsd: value })
        : null;
    return {
      productId: row.product.id,
      productCode: row.product.code,
      description: row.product.description,
      isSerialized: row.product.isSerialized,
      quantity: quantity.toFixed(2),
      reservedQuantity: reserved.toFixed(2),
      availableQuantity: quantity.minus(reserved).toFixed(2),
      valueUsd: value?.toFixed(2) ?? null,
      averageCostUsd: average?.toFixed(2) ?? null,
    };
  });
}
