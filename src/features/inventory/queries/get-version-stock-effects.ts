// src/features/inventory/queries/get-version-stock-effects.ts
// Qué hará aprobar una versión en BORRADOR con el stock de DIMA: qué se reservará, dónde y qué falta, con el
// mismo plan que aplica el servidor (AGENTS.md §2.8). Solo cantidades: nunca costos (regla 12).
// LIMITACIÓN: sin alcance propio; solo se llama desde el editor del CV, que ya filtró con scopeCvQuery.
import Decimal from "decimal.js";
import { prisma } from "@/server/db";
import {
  findReservationPlanProblem,
  planReservationsForVersion,
} from "@/server/inventory/version-reservation-plan";

export type StockShortage = {
  description: string;
  productCode: string;
  requested: string;
  available: string;
};

export type StockEffects = {
  problem: string | null;
  warehouseName: string | null;
  reservedLines: number;
  shortages: StockShortage[];
};

export async function getVersionStockEffects(
  versionId: string,
): Promise<StockEffects | null> {
  const context = await planReservationsForVersion(prisma, versionId);
  const problem = findReservationPlanProblem(context);
  const needs = context.plan.ops.flatMap((op) => {
    if (op.kind === "CREATE")
      return [
        { lineId: op.lineId, productId: op.productId, quantity: op.quantity },
      ];
    if (op.kind === "ADJUST" && op.deltaQuantity.greaterThan(0)) {
      const ref = context.reservations.get(op.reservationId);
      return ref
        ? [
            {
              lineId: op.lineId,
              productId: ref.productId,
              quantity: op.deltaQuantity,
            },
          ]
        : [];
    }
    return [];
  });
  if (!problem && needs.length === 0) return null;
  const warehouse = await prisma.warehouse.findFirst({
    where: { kind: "FISICO", cityId: context.cityId, isActive: true },
    select: { id: true, name: true },
  });
  const stocks = warehouse
    ? await prisma.stock.findMany({
        where: {
          warehouseId: warehouse.id,
          productId: { in: needs.map((n) => n.productId) },
        },
        select: { productId: true, quantity: true, reservedQuantity: true },
      })
    : [];
  const codes = await prisma.product.findMany({
    where: { id: { in: needs.map((n) => n.productId) } },
    select: { id: true, code: true },
  });
  const shortages = needs.flatMap((need) => {
    const stock = stocks.find((s) => s.productId === need.productId);
    const available = stock
      ? new Decimal(stock.quantity.toString()).minus(
          stock.reservedQuantity.toString(),
        )
      : new Decimal(0);
    if (!need.quantity.greaterThan(available)) return [];
    return [
      {
        description:
          context.lineDescriptions.get(need.lineId) ?? "línea de stock",
        productCode: codes.find((c) => c.id === need.productId)?.code ?? "",
        requested: need.quantity.toString(),
        available: Decimal.max(available, 0).toString(),
      },
    ];
  });
  return {
    problem,
    warehouseName: warehouse?.name ?? null,
    reservedLines: needs.length,
    shortages,
  };
}
