// tests/integration/inventory-dashboard.int.test.ts
// Tablero de inventario contra la base (AGENTS.md §2.8, §6): valor por almacén, salidas netas de devoluciones,
// valor de apertura y cierre desde el libro, rotación y que sin costos no hay tablero.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { currentPeriodRef } from "@/domain/dashboards/period";
import { getInventoryDashboard } from "@/features/dashboards/queries/get-inventory-dashboard";
import { dispatchItems } from "@/server/inventory/dispatch-items";
import { returnItems } from "@/server/inventory/return-items";
import { createInventoryFixture, d, postAll } from "./inventory-fixtures";
import { createTestPrisma, createUserWithRoles } from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("tablero de inventario", () => {
  it("rotación = salidas netas ÷ valor promedio; el ingeniero no lo ve", async () => {
    const f = await createInventoryFixture(db);
    await postAll(db, [
      {
        kind: "INGRESO",
        receiptOrigin: "COMPRA_LOCAL",
        warehouseId: f.origin.id,
        actorId: f.actorId,
        lines: [
          {
            productId: f.plain.id,
            direction: "IN",
            quantity: d(5),
            valueUsd: d(500),
          },
        ],
      },
    ]);
    const out = await db.$transaction((tx) =>
      dispatchItems(tx, f.actorId, {
        warehouseId: f.origin.id,
        destination: { kind: "INTERNO", reason: "Laboratorio" },
        notes: null,
        idempotencyKey: randomUUID(),
        lines: [{ productId: f.plain.id, quantity: d(2), serials: [] }],
      }),
    );
    const line = await db.invMovementLine.findFirstOrThrow({
      where: { movementId: out.movementId },
    });
    await db.$transaction((tx) =>
      returnItems(tx, f.actorId, {
        movementId: out.movementId,
        lines: [{ lineId: line.id, quantity: d(1) }],
        notes: "Sobró",
        idempotencyKey: randomUUID(),
      }),
    );

    const input = {
      period: currentPeriodRef("MES", { now: () => new Date() }),
      cityId: f.city.id,
    };
    const gg = await createUserWithRoles(db, "GG", [
      { code: "GERENTE_GENERAL" },
    ]);
    const board = await getInventoryDashboard(gg, input);
    expect(board?.warehouses.map((w) => [w.id, w.valueUsd])).toEqual([
      [f.origin.id, "400.00"],
    ]);
    expect(board).toMatchObject({
      totalValueUsd: "400.00",
      outboundUsd: "100.00",
      openingUsd: "0.00",
      closingUsd: "400.00",
      turnover: "0.50",
    });

    const engineer = await createUserWithRoles(db, "Ing", [
      { code: "INGENIERO" },
    ]);
    expect(await getInventoryDashboard(engineer, input)).toBeNull();
  });
});
