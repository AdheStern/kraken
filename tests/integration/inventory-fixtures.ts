// tests/integration/inventory-fixtures.ts
// Datos mínimos de inventario para los tests: almacenes en dos ciudades más TRANSITO, productos y un operador,
// y la conciliación de la caché del stock contra sus libros.
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { lockStocks, type StockKey } from "@/server/inventory/lock-stocks";
import {
  type InvMovementInput,
  postInvMovement,
} from "@/server/inventory/post-inv-movement";
import { createCity, createCvFixture } from "./test-db";

const code = () => randomUUID().slice(0, 8).toUpperCase();
export const d = (value: string | number) => new Decimal(value);

export async function createInventoryFixture(db: PrismaClient) {
  const cv = await createCvFixture(db);
  const otherCity = await createCity(db);
  const physical = (cityId: string) =>
    db.warehouse.create({
      data: { code: code(), name: "Almacén", kind: "FISICO", cityId },
    });
  const transit =
    (await db.warehouse.findFirst({ where: { kind: "TRANSITO" } })) ??
    (await db.warehouse.create({
      data: { code: code(), name: "En tránsito", kind: "TRANSITO" },
    }));
  const product = (isSerialized: boolean) =>
    db.product.create({
      data: {
        code: code(),
        description: "Equipo",
        itemType: "HARDWARE",
        isSerialized,
      },
    });
  return {
    ...cv,
    actorId: cv.userId,
    origin: await physical(cv.city.id),
    destination: await physical(otherCity.id),
    transit,
    plain: await product(false),
    serialized: await product(true),
  };
}

// Bloquea todo lo que tocan los movimientos y los registra en orden, como lo hará cada action.
export function postAll(
  db: PrismaClient,
  inputs: readonly InvMovementInput[],
  extraKeys: readonly StockKey[] = [],
) {
  return db.$transaction(async (tx: Tx) => {
    const keys = inputs.flatMap((input) =>
      input.lines.map((l) => ({
        warehouseId: input.warehouseId,
        productId: l.productId,
      })),
    );
    const locked = await lockStocks(tx, [...keys, ...extraKeys]);
    const posted = [];
    for (const input of inputs)
      posted.push(await postInvMovement(tx, locked, input));
    return posted;
  });
}

// REGLA: la caché del stock es la suma de su libro y lo reservado la de su libro de reservas (§0.6).
export async function reconcile(db: PrismaClient, key: StockKey) {
  const stock = await db.stock.findUniqueOrThrow({
    where: { warehouseId_productId: key },
  });
  const lines = await db.invMovementLine.aggregate({
    where: {
      productId: key.productId,
      movement: { warehouseId: key.warehouseId },
    },
    _sum: { quantity: true, valueUsd: true },
  });
  const reserved = await db.reservationMovement.aggregate({
    where: { reservation: key },
    _sum: { quantity: true },
  });
  const sum = (value: { toString(): string } | null) =>
    d(value?.toString() ?? 0);
  return {
    quantity: d(stock.quantity.toString()),
    valueUsd: d(stock.valueUsd.toString()),
    reservedQuantity: d(stock.reservedQuantity.toString()),
    matches:
      sum(lines._sum.quantity).equals(stock.quantity.toString()) &&
      sum(lines._sum.valueUsd).equals(stock.valueUsd.toString()) &&
      sum(reserved._sum.quantity).equals(stock.reservedQuantity.toString()),
  };
}
