// tests/integration/warehouse-blocker.int.test.ts
// Baja de un almacén (AGENTS.md §2.8, §4): no con stock ni con reservas activas, y TRANSITO nunca.
import { afterAll, describe, expect, it } from "vitest";
import { findWarehouseBlocker } from "@/server/inventory/warehouse-blocker";
import { createInventoryFixture, d, postAll } from "./inventory-fixtures";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const blocker = (warehouseId: string) =>
  db.$transaction((tx) => findWarehouseBlocker(tx, warehouseId));

describe("findWarehouseBlocker", () => {
  it("un almacén vacío se puede dar de baja; con stock no; TRANSITO nunca", async () => {
    const f = await createInventoryFixture(db);
    expect(await blocker(f.origin.id)).toBeNull();
    await postAll(db, [
      {
        kind: "INGRESO",
        receiptOrigin: "INVENTARIO_INICIAL",
        warehouseId: f.origin.id,
        actorId: f.actorId,
        lines: [
          {
            productId: f.plain.id,
            direction: "IN",
            quantity: d(1),
            valueUsd: d(5),
          },
        ],
      },
    ]);
    expect(await blocker(f.origin.id)).toMatch(/Tiene stock/);
    expect(await blocker(f.transit.id)).toMatch(/tránsito no se da de baja/);
  });

  it("con reservas activas no se da de baja", async () => {
    const f = await createInventoryFixture(db);
    const cvLine = await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        kind: "ITEM",
        areaId: f.area.id,
        description: "Switch",
        quantity: "1",
        productId: f.plain.id,
        supplyMode: "STOCK_DIMA",
      },
    });
    await db.reservation.create({
      data: {
        cvLineId: cvLine.id,
        originLineId: cvLine.id,
        warehouseId: f.destination.id,
        productId: f.plain.id,
        quantity: "1",
      },
    });
    expect(await blocker(f.destination.id)).toMatch(/reservas de CV activas/);
  });
});
