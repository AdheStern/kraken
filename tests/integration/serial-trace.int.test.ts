// tests/integration/serial-trace.int.test.ts
// Recorrido de un serial (AGENTS.md §2.8, decisión 2026-11-05): Almacén ve sus movimientos; el comercial ve la
// unidad y el CV donde lo vendió, pero no el kardex (§2.9); nadie ve costos.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getSerialTrace } from "@/features/inventory/queries/get-serial-trace";
import { resolveInboundSerials } from "@/server/inventory/serial-units";
import { createInventoryFixture, d, postAll } from "./inventory-fixtures";
import { createTestPrisma, createUserWithRoles } from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("getSerialTrace", () => {
  it("cada rol ve el recorrido que le corresponde", async () => {
    const f = await createInventoryFixture(db);
    const serial = `SN-${randomUUID().slice(0, 8)}`;
    const ids = await db.$transaction((tx) =>
      resolveInboundSerials(tx, f.serialized.id, [serial]),
    );
    await postAll(db, [
      {
        kind: "INGRESO",
        receiptOrigin: "COMPRA_LOCAL",
        warehouseId: f.origin.id,
        actorId: f.actorId,
        documentRef: "PO-77",
        lines: [
          {
            productId: f.serialized.id,
            direction: "IN",
            quantity: d(1),
            valueUsd: d(900),
            serialUnitId: ids.get(serial),
          },
        ],
      },
    ]);
    const seller = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    await db.cv.update({
      where: { id: f.cv.id },
      data: { createdById: seller.id },
    });
    await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        kind: "ITEM",
        areaId: f.area.id,
        description: "FortiGate",
        serials: { create: { serial } },
      },
    });
    const warehouse = await createUserWithRoles(db, "Almacén", [
      { code: "ALMACEN" },
    ]);

    const forWarehouse = await getSerialTrace(warehouse, serial.toLowerCase());
    expect(forWarehouse.units).toHaveLength(1);
    expect(forWarehouse.units[0].events).toMatchObject([
      { kind: "INGRESO", isIn: true, document: { label: "PO-77" } },
    ]);
    expect(forWarehouse.sales).toHaveLength(0);

    const forSeller = await getSerialTrace(seller, serial);
    expect(forSeller.units[0].events).toHaveLength(0);
    expect(forSeller.sales).toMatchObject([{ description: "FortiGate" }]);
    expect(JSON.stringify(forSeller)).not.toContain("900");
  });
});
