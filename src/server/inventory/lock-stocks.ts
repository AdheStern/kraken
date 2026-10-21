// src/server/inventory/lock-stocks.ts
// Bloquea (SELECT … FOR UPDATE) todas las filas de inv.stock que toca una operación, creándolas si faltan, y
// devuelve su estado vigente para que los movimientos lo actualicen en memoria (ADR-03).
import Decimal from "decimal.js";
import { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";

export type StockKey = { warehouseId: string; productId: string };

export type LockedStock = StockKey & {
  stockId: string;
  quantity: Decimal;
  reservedQuantity: Decimal;
  valueUsd: Decimal;
};

// Mutable a propósito: cada movimiento de la transacción parte del saldo que dejó el anterior.
export type LockedStocks = Map<string, LockedStock>;

type Row = {
  id: string;
  almacen_id: string;
  producto_id: string;
  cantidad: string;
  cantidad_reservada: string;
  valor_usd: string;
};

export const stockKey = (key: StockKey) =>
  `${key.warehouseId}:${key.productId}`;

// TRAMPA: una operación (p. ej. un traspaso: origen, TRANSITO y destino) bloquea todo en un solo llamado y en un
// orden fijo (almacén, producto). Bloquear de a poco, o en otro orden, interbloquea un envío LP→SC con una
// recepción SC→LP simultánea.
export async function lockStocks(
  tx: Tx,
  keys: readonly StockKey[],
): Promise<LockedStocks> {
  const unique = [...new Map(keys.map((k) => [stockKey(k), k])).values()].sort(
    (a, b) =>
      compare(a.warehouseId, b.warehouseId) ||
      compare(a.productId, b.productId),
  );
  if (unique.length === 0) return new Map();
  await tx.stock.createMany({ data: unique, skipDuplicates: true });
  const rows = await tx.$queryRaw<Row[]>`
    SELECT id::text AS id, almacen_id::text AS almacen_id, producto_id::text AS producto_id,
           cantidad::text AS cantidad, cantidad_reservada::text AS cantidad_reservada, valor_usd::text AS valor_usd
    FROM inv.stock
    WHERE (almacen_id, producto_id) IN (${Prisma.join(
      unique.map(
        (k) => Prisma.sql`(${k.warehouseId}::uuid, ${k.productId}::uuid)`,
      ),
    )})
    ORDER BY almacen_id, producto_id
    FOR UPDATE`;
  return new Map(
    rows.map((row) => {
      const locked: LockedStock = {
        stockId: row.id,
        warehouseId: row.almacen_id,
        productId: row.producto_id,
        quantity: new Decimal(row.cantidad),
        reservedQuantity: new Decimal(row.cantidad_reservada),
        valueUsd: new Decimal(row.valor_usd),
      };
      return [stockKey(locked), locked];
    }),
  );
}

export function lockedStock(locked: LockedStocks, key: StockKey): LockedStock {
  const stock = locked.get(stockKey(key));
  if (!stock)
    throw new Error(
      `Stock sin bloquear: ${stockKey(key)}; llama a lockStocks antes.`,
    );
  return stock;
}

// POR QUÉ: el mismo orden que usa Postgres al ordenar uuid (bytes), para que createMany y FOR UPDATE coincidan.
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
