// src/server/inventory/count/count-snapshot.ts
// Foto del sistema de un almacén en el instante en que empezó un conteo, reconstruida desde el libro: cantidades y
// seriales presentes (AGENTS.md §2.8). Lo que se movió después no la cambia; el ajuste aplica el delta.
import Decimal from "decimal.js";
import type { CountItem } from "@/domain/inventory/count-differences";
import type { Tx } from "@/server/db";

export async function countSnapshot(
  tx: Tx,
  warehouseId: string,
  at: Date,
): Promise<CountItem[]> {
  const movementAt = { warehouseId, createdAt: { lte: at } };
  const totals = await tx.invMovementLine.groupBy({
    by: ["productId"],
    where: { movement: movementAt },
    _sum: { quantity: true },
  });
  const serialLines = await tx.invMovementLine.findMany({
    where: { serialUnitId: { not: null }, movement: movementAt },
    orderBy: [{ movement: { number: "asc" } }, { id: "asc" }],
    select: {
      productId: true,
      quantity: true,
      serialUnit: { select: { serial: true } },
    },
  });
  // POR QUÉ: un serial está en el almacén si su último movimiento ahí, hasta ese instante, fue una entrada.
  const lastSign = new Map<string, { productId: string; isIn: boolean }>();
  for (const line of serialLines)
    if (line.serialUnit)
      lastSign.set(`${line.productId}:${line.serialUnit.serial}`, {
        productId: line.productId,
        isIn: new Decimal(line.quantity.toString()).isPositive(),
      });
  const products = await tx.product.findMany({
    where: { id: { in: totals.map((t) => t.productId) } },
    select: { id: true, isSerialized: true },
  });
  return totals
    .map((t) => {
      const isSerialized =
        products.find((p) => p.id === t.productId)?.isSerialized ?? false;
      const serials = [...lastSign.entries()]
        .filter(([, v]) => v.isIn && v.productId === t.productId)
        .map(([key]) => key.slice(t.productId.length + 1));
      return {
        productId: t.productId,
        isSerialized,
        quantity: new Decimal(t._sum.quantity?.toString() ?? 0),
        serials,
      };
    })
    .filter((item) => !item.quantity.isZero() || item.serials.length > 0);
}
