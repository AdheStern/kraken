// tests/integration/inventory-constraints.int.test.ts
// Restricciones del esquema inv (AGENTS.md §2.8, ADR-03): un TRANSITO y un físico activo por ciudad, valor sin
// cantidad imposible, una unidad por serial y libro de reservas inmutable.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createCity, createCvFixture, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const code = () => randomUUID().slice(0, 8).toUpperCase();

function createProduct(isSerialized = false) {
  return db.product.create({
    data: {
      code: code(),
      description: "Switch",
      itemType: "HARDWARE",
      isSerialized,
    },
  });
}

describe("inv: almacenes", () => {
  it("admite un solo TRANSITO", async () => {
    const existing = await db.warehouse.findFirst({
      where: { kind: "TRANSITO" },
    });
    if (!existing)
      await db.warehouse.create({
        data: { code: code(), name: "Tránsito", kind: "TRANSITO" },
      });
    await expect(
      db.warehouse.create({
        data: { code: code(), name: "Otro tránsito", kind: "TRANSITO" },
      }),
    ).rejects.toThrow();
  });

  it("admite un solo físico activo por ciudad y exige la ciudad", async () => {
    const city = await createCity(db);
    const physical = { name: "Almacén", kind: "FISICO" as const };
    const first = await db.warehouse.create({
      data: { ...physical, code: code(), cityId: city.id },
    });
    await expect(
      db.warehouse.create({
        data: { ...physical, code: code(), cityId: city.id },
      }),
    ).rejects.toThrow();
    await db.warehouse.update({
      where: { id: first.id },
      data: { isActive: false },
    });
    await db.warehouse.create({
      data: { ...physical, code: code(), cityId: city.id },
    });
    await expect(
      db.warehouse.create({ data: { ...physical, code: code() } }),
    ).rejects.toThrow(/almacen_fisico_ciudad_ck/);
  });
});

describe("inv: stock y libro", () => {
  it("el stock no guarda valor sin cantidad", async () => {
    const city = await createCity(db);
    const warehouse = await db.warehouse.create({
      data: { code: code(), name: "A", kind: "FISICO", cityId: city.id },
    });
    const product = await createProduct();
    await expect(
      db.stock.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          valueUsd: "10",
        },
      }),
    ).rejects.toThrow(/stock_valor_ck/);
  });

  it("una línea con serial mueve una sola unidad y el INGRESO exige su origen", async () => {
    const f = await createCvFixture(db);
    const warehouse = await db.warehouse.create({
      data: { code: code(), name: "A", kind: "FISICO", cityId: f.city.id },
    });
    const product = await createProduct(true);
    const serial = await db.serialUnit.create({
      data: { productId: product.id, serial: code() },
    });
    const line = {
      productId: product.id,
      quantity: "2",
      valueUsd: "200",
      balanceQuantity: "2",
      balanceValueUsd: "200",
      serialUnitId: serial.id,
    };
    const movement = {
      kind: "INGRESO" as const,
      warehouseId: warehouse.id,
      actorId: f.userId,
    };
    await expect(
      db.invMovement.create({
        data: {
          ...movement,
          receiptOrigin: "COMPRA_LOCAL",
          lines: { create: line },
        },
      }),
    ).rejects.toThrow(/movimiento_linea_serial_ck/);
    await expect(db.invMovement.create({ data: movement })).rejects.toThrow(
      /movimiento_origen_ingreso_ck/,
    );
  });

  it("el libro de reservas es inmutable", async () => {
    const f = await createCvFixture(db);
    const warehouse = await db.warehouse.create({
      data: { code: code(), name: "A", kind: "FISICO", cityId: f.city.id },
    });
    const product = await createProduct();
    const cvLine = await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        kind: "ITEM",
        areaId: f.area.id,
        description: "Switch",
        quantity: "1",
        productId: product.id,
        supplyMode: "STOCK_DIMA",
      },
    });
    const reservation = await db.reservation.create({
      data: {
        cvLineId: cvLine.id,
        originLineId: cvLine.id,
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: "1",
        movements: { create: { kind: "CREAR", quantity: "1" } },
      },
      include: { movements: true },
    });
    const [entry] = reservation.movements;
    await expect(
      db.reservationMovement.update({
        where: { id: entry.id },
        data: { quantity: "5" },
      }),
    ).rejects.toThrow(/inmutable/);
    await expect(
      db.reservationMovement.delete({ where: { id: entry.id } }),
    ).rejects.toThrow(/inmutable/);
  });
});
