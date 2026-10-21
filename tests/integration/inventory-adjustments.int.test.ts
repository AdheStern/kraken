// tests/integration/inventory-adjustments.int.test.ts
// Ajustes con aprobación (AGENTS.md §2.8, §2.9): nada entra al libro hasta aprobarse; lo que entra vale al
// promedio o al costo indicado; una sola decisión; la baja de un traspaso se valoriza contra su línea y lo cierra.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { AdjustmentLine } from "@/server/inventory/adjustments/adjustment-lines";
import { decideAdjustment } from "@/server/inventory/adjustments/decide-adjustment";
import { requestAdjustment } from "@/server/inventory/adjustments/request-adjustment";
import { createTransfer } from "@/server/inventory/transfers/create-transfer";
import { sendTransfer } from "@/server/inventory/transfers/send-transfer";
import {
  createInventoryFixture,
  d,
  postAll,
  reconcile,
} from "./inventory-fixtures";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Fixture = Awaited<ReturnType<typeof createInventoryFixture>>;

const line = (
  productId: string,
  delta: string,
  over: Partial<AdjustmentLine> = {},
): AdjustmentLine => ({
  productId,
  delta,
  unitCostUsd: null,
  serials: [],
  transferLineId: null,
  systemQuantity: null,
  ...over,
});

async function withStock(quantity: number, valueUsd: number) {
  const f = await createInventoryFixture(db);
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
          quantity: d(quantity),
          valueUsd: d(valueUsd),
        },
      ],
    },
  ]);
  return f;
}

const request = (
  f: Fixture,
  lines: AdjustmentLine[],
  over: { warehouseId?: string; origin?: "MANUAL" | "TRASPASO" } = {},
) =>
  db.$transaction((tx) =>
    requestAdjustment(tx, f.actorId, {
      warehouseId: over.warehouseId ?? f.origin.id,
      areaId: null,
      origin: over.origin ?? "MANUAL",
      reason: "Conteo de fin de mes",
      lines,
    }),
  );

const decide = (deciderId: string, requestId: string, approve = true) =>
  db.$transaction((tx) =>
    decideAdjustment(tx, deciderId, {
      requestId,
      approve,
      comment: approve ? "" : "No cuadra con el conteo",
    }),
  );

describe("ajustes", () => {
  it("nada entra hasta aprobarse; lo que entra vale al promedio y lo que sale también", async () => {
    const f = await withStock(4, 100);
    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);
    const { requestId } = await request(f, [line(f.plain.id, "2")]);
    expect(
      (
        await reconcile(db, { warehouseId: f.origin.id, productId: f.plain.id })
      ).quantity.toNumber(),
    ).toBe(4);
    await decide(admin.id, requestId);
    let stock = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: f.plain.id,
    });
    expect([
      stock.quantity.toNumber(),
      stock.valueUsd.toFixed(2),
      stock.matches,
    ]).toEqual([6, "150.00", true]);
    const out = await request(f, [line(f.plain.id, "-1")]);
    await decide(admin.id, out.requestId);
    stock = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: f.plain.id,
    });
    expect([stock.quantity.toNumber(), stock.valueUsd.toFixed(2)]).toEqual([
      5,
      "125.00",
    ]);
    await expect(decide(admin.id, out.requestId)).rejects.toThrow(
      /ya fue decidida/,
    );
  });

  it("sin stock exige el costo; rechazar exige comentario y no mueve nada", async () => {
    const f = await createInventoryFixture(db);
    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);
    const noCost = await request(f, [line(f.plain.id, "1")]);
    await expect(decide(admin.id, noCost.requestId)).rejects.toThrow(
      /indica el costo/,
    );
    const priced = await request(f, [
      line(f.plain.id, "2", { unitCostUsd: "7.50" }),
    ]);
    await decide(admin.id, priced.requestId);
    expect(
      (
        await reconcile(db, { warehouseId: f.origin.id, productId: f.plain.id })
      ).valueUsd.toFixed(2),
    ).toBe("15.00");
    const rejected = await request(f, [line(f.plain.id, "-2")]);
    await expect(
      db.$transaction((tx) =>
        decideAdjustment(tx, admin.id, {
          requestId: rejected.requestId,
          approve: false,
          comment: "",
        }),
      ),
    ).rejects.toThrow(/por qué se rechaza/);
    await decide(admin.id, rejected.requestId, false);
    expect(
      (
        await reconcile(db, { warehouseId: f.origin.id, productId: f.plain.id })
      ).quantity.toNumber(),
    ).toBe(2);
  });

  it("da de baja lo que no llegó de un traspaso, al valor de su línea, y cierra el traspaso", async () => {
    const f = await withStock(3, 90);
    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);
    const { transferId } = await db.$transaction((tx) =>
      createTransfer(tx, f.actorId, {
        originWarehouseId: f.origin.id,
        destinationWarehouseId: f.destination.id,
        notes: null,
        lines: [{ productId: f.plain.id, quantity: d(3), serials: [] }],
      }),
    );
    await db.$transaction((tx) => sendTransfer(tx, f.actorId, transferId));
    const [transferLine] = await db.transferLine.findMany({
      where: { transferId },
    });
    await expect(
      request(
        f,
        [line(f.plain.id, "-1", { transferLineId: transferLine.id })],
        { origin: "MANUAL", warehouseId: f.transit.id },
      ),
    ).rejects.toThrow(/se ajustan en tránsito/);
    await expect(
      request(
        f,
        [line(f.plain.id, "-4", { transferLineId: transferLine.id })],
        { origin: "TRASPASO", warehouseId: f.transit.id },
      ),
    ).rejects.toThrow(/más de lo que sigue en camino/);
    const writeOff = await request(
      f,
      [line(f.plain.id, "-3", { transferLineId: transferLine.id })],
      {
        origin: "TRASPASO",
        warehouseId: f.transit.id,
      },
    );
    await decide(admin.id, writeOff.requestId);
    const transit = await reconcile(db, {
      warehouseId: f.transit.id,
      productId: f.plain.id,
    });
    expect([
      transit.quantity.toNumber(),
      transit.valueUsd.toFixed(2),
      transit.matches,
    ]).toEqual([0, "0.00", true]);
    expect(
      (await db.transfer.findUniqueOrThrow({ where: { id: transferId } }))
        .status,
    ).toBe("RECIBIDO");
  });

  it("avisa a quienes deciden y a quien pidió", async () => {
    const f = await withStock(1, 10);
    const admin = await createUserWithRoles(
      db,
      `Admin ${randomUUID().slice(0, 4)}`,
      [{ code: "ADMINISTRACION" }],
    );
    const { requestId } = await request(f, [line(f.plain.id, "-1")]);
    expect(
      await db.inboxItem.count({
        where: { userId: admin.id, eventType: "AJUSTE_SOLICITADO" },
      }),
    ).toBe(1);
    await decide(admin.id, requestId);
    expect(
      await db.inboxItem.count({
        where: { userId: f.actorId, eventType: "AJUSTE_DECIDIDO" },
      }),
    ).toBe(1);
  });
});
