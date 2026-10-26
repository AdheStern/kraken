// tests/integration/inventory-return-source.int.test.ts
// Salida a devolver (AGENTS.md §2.8 DEVOLUCION, regla 12): lo que queda por línea tras una devolución parcial,
// sin costos, y solo con el alcance de inventario.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getReturnSource } from "@/features/inventory/queries/get-return-source";
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

describe("salida a devolver", () => {
  it("muestra lo despachado y lo que queda, sin costos, solo a quien opera inventario", async () => {
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
        destination: { kind: "INTERNO", reason: "Laboratorio de pruebas" },
        notes: null,
        idempotencyKey: randomUUID(),
        lines: [{ productId: f.plain.id, quantity: d(3), serials: [] }],
      }),
    );
    const line = await db.invMovementLine.findFirstOrThrow({
      where: { movementId: out.movementId },
    });
    await db.$transaction((tx) =>
      returnItems(tx, f.actorId, {
        movementId: out.movementId,
        lines: [{ lineId: line.id, quantity: d(1) }],
        notes: null,
        idempotencyKey: randomUUID(),
      }),
    );
    const storekeeper = await createUserWithRoles(db, "Almacén", [
      { code: "ALMACEN" },
    ]);

    const source = await getReturnSource(storekeeper, out.number);
    expect(source).toMatchObject({
      movementId: out.movementId,
      destination: "Uso interno",
      lines: [{ lineId: line.id, shipped: "3", remaining: "2" }],
    });
    expect(JSON.stringify(source)).not.toMatch(/value|cost|Usd/i);

    const engineer = await createUserWithRoles(db, "Ingeniero", [
      { code: "INGENIERO" },
    ]);
    expect(await getReturnSource(engineer, out.number)).toBeNull();
  });
});
