// tests/integration/inventory-transfers.int.test.ts
// Traspasos en dos pasos (AGENTS.md §2.8, §8): TRANSITO no mezcla costos de orígenes distintos, recepción parcial
// con diferencias, seriales en tránsito, solo lo disponible, estados y recepciones simultáneas.
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { afterAll, describe, expect, it } from "vitest";
import { lockStocks } from "@/server/inventory/lock-stocks";
import { postReservationMovement } from "@/server/inventory/post-reservation-movement";
import { resolveInboundSerials } from "@/server/inventory/serial-units";
import { cancelTransfer } from "@/server/inventory/transfers/cancel-transfer";
import { createTransfer } from "@/server/inventory/transfers/create-transfer";
import { receiveTransfer } from "@/server/inventory/transfers/receive-transfer";
import { sendTransfer } from "@/server/inventory/transfers/send-transfer";
import {
  createInventoryFixture,
  d,
  postAll,
  reconcile,
} from "./inventory-fixtures";
import { createCity, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Fixture = Awaited<ReturnType<typeof createInventoryFixture>>;

const receipt = (
  f: Fixture,
  warehouseId: string,
  quantity: number,
  valueUsd: number,
  productId = f.plain.id,
) =>
  postAll(db, [
    {
      kind: "INGRESO",
      receiptOrigin: "COMPRA_LOCAL",
      warehouseId,
      actorId: f.actorId,
      lines: [
        {
          productId,
          direction: "IN",
          quantity: d(quantity),
          valueUsd: d(valueUsd),
        },
      ],
    },
  ]);

async function sentTransfer(
  f: Fixture,
  from: string,
  to: string,
  quantity: number,
  serials: string[] = [],
  productId = f.plain.id,
) {
  const { transferId } = await db.$transaction((tx) =>
    createTransfer(tx, f.actorId, {
      originWarehouseId: from,
      destinationWarehouseId: to,
      notes: null,
      lines: [{ productId, quantity: d(quantity), serials }],
    }),
  );
  await db.$transaction((tx) => sendTransfer(tx, f.actorId, transferId));
  return transferId;
}

const linesOf = (transferId: string) =>
  db.transferLine.findMany({ where: { transferId }, orderBy: { id: "asc" } });

const receive = (
  f: Fixture,
  transferId: string,
  receipts: { transferLineId: string; quantity: Decimal }[],
) =>
  db.$transaction((tx) => receiveTransfer(tx, f.actorId, transferId, receipts));

const stock = (f: Fixture, warehouseId: string, productId = f.plain.id) =>
  reconcile(db, { warehouseId, productId });

describe("traspasos", () => {
  it("lo que llega vale lo que envió su origen, no el promedio de TRANSITO", async () => {
    const f = await createInventoryFixture(db);
    const third = await db.warehouse.create({
      data: {
        code: `W-${randomUUID().slice(0, 8)}`,
        name: "CB",
        kind: "FISICO",
        cityId: (await createCity(db)).id,
      },
    });
    await receipt(f, f.origin.id, 1, 100);
    await receipt(f, third.id, 1, 120);
    const cheap = await sentTransfer(f, f.origin.id, f.destination.id, 1);
    await sentTransfer(f, third.id, f.destination.id, 1);
    expect((await stock(f, f.transit.id)).valueUsd.toFixed(2)).toBe("220.00");
    const [line] = await linesOf(cheap);
    expect(
      await receive(f, cheap, [{ transferLineId: line.id, quantity: d(1) }]),
    ).toEqual({ status: "RECIBIDO" });
    const arrived = await stock(f, f.destination.id);
    const transit = await stock(f, f.transit.id);
    expect([arrived.valueUsd.toFixed(2), transit.valueUsd.toFixed(2)]).toEqual([
      "100.00",
      "120.00",
    ]);
    for (const w of [f.origin.id, third.id, f.destination.id, f.transit.id])
      expect((await stock(f, w)).matches).toBe(true);
  });

  it("recibe en partes: queda con diferencias, no recibe de más y cierra exacto", async () => {
    const f = await createInventoryFixture(db);
    await receipt(f, f.origin.id, 3, 100);
    const transferId = await sentTransfer(f, f.origin.id, f.destination.id, 3);
    const [line] = await linesOf(transferId);
    expect(
      await receive(f, transferId, [
        { transferLineId: line.id, quantity: d(1) },
      ]),
    ).toEqual({
      status: "RECIBIDO_CON_DIFERENCIAS",
    });
    await expect(
      receive(f, transferId, [{ transferLineId: line.id, quantity: d(3) }]),
    ).rejects.toThrow(/más de lo que queda/);
    await receive(f, transferId, [{ transferLineId: line.id, quantity: d(2) }]);
    const transfer = await db.transfer.findUniqueOrThrow({
      where: { id: transferId },
    });
    expect(transfer.status).toBe("RECIBIDO");
    expect((await stock(f, f.destination.id)).valueUsd.toFixed(2)).toBe(
      "100.00",
    );
    await expect(
      receive(f, transferId, [{ transferLineId: line.id, quantity: d(1) }]),
    ).rejects.toThrow(/nada en camino/);
  });

  it("un serial viaja EN_TRANSITO y queda EN_STOCK en el destino", async () => {
    const f = await createInventoryFixture(db);
    const serial = `SN-${randomUUID().slice(0, 8)}`;
    const ids = await db.$transaction((tx) =>
      resolveInboundSerials(tx, f.serialized.id, [serial]),
    );
    const serialUnitId = ids.get(serial) as string;
    await postAll(db, [
      {
        kind: "INGRESO",
        receiptOrigin: "COMPRA_LOCAL",
        warehouseId: f.origin.id,
        actorId: f.actorId,
        lines: [
          {
            productId: f.serialized.id,
            direction: "IN",
            quantity: d(1),
            valueUsd: d(900),
            serialUnitId,
          },
        ],
      },
    ]);
    const transferId = await sentTransfer(
      f,
      f.origin.id,
      f.destination.id,
      1,
      [serial],
      f.serialized.id,
    );
    let unit = await db.serialUnit.findUniqueOrThrow({
      where: { id: serialUnitId },
    });
    expect([unit.status, unit.warehouseId]).toEqual([
      "EN_TRANSITO",
      f.transit.id,
    ]);
    const [line] = await linesOf(transferId);
    await receive(f, transferId, [{ transferLineId: line.id, quantity: d(1) }]);
    unit = await db.serialUnit.findUniqueOrThrow({
      where: { id: serialUnitId },
    });
    expect([unit.status, unit.warehouseId]).toEqual([
      "EN_STOCK",
      f.destination.id,
    ]);
  });

  it("solo lleva lo disponible, se envía una vez y solo el borrador se cancela", async () => {
    const f = await createInventoryFixture(db);
    await receipt(f, f.origin.id, 2, 20);
    const cvLine = await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        kind: "ITEM",
        areaId: f.area.id,
        description: "Switch",
        quantity: "2",
      },
    });
    await db.$transaction(async (tx) => {
      const key = { warehouseId: f.origin.id, productId: f.plain.id };
      const locked = await lockStocks(tx, [key]);
      await postReservationMovement(tx, locked, {
        kind: "CREAR",
        cvLineId: cvLine.id,
        originLineId: cvLine.id,
        ...key,
        quantity: d(1),
        actorId: f.actorId,
      });
    });
    await expect(
      sentTransfer(f, f.origin.id, f.destination.id, 2),
    ).rejects.toThrow(/hay 1 disponibles/);
    const transferId = await sentTransfer(f, f.origin.id, f.destination.id, 1);
    await expect(
      db.$transaction((tx) => sendTransfer(tx, f.actorId, transferId)),
    ).rejects.toThrow(/ya se envió/);
    await expect(
      db.$transaction((tx) => cancelTransfer(tx, transferId)),
    ).rejects.toThrow(/borrador/);
  });

  it("dos recepciones simultáneas de la misma línea no reciben de más", async () => {
    const f = await createInventoryFixture(db);
    await receipt(f, f.origin.id, 2, 50);
    const transferId = await sentTransfer(f, f.origin.id, f.destination.id, 2);
    const [line] = await linesOf(transferId);
    const results = await Promise.allSettled([
      receive(f, transferId, [
        { transferLineId: line.id, quantity: new Decimal(2) },
      ]),
      receive(f, transferId, [
        { transferLineId: line.id, quantity: new Decimal(2) },
      ]),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect((await stock(f, f.destination.id)).quantity.toNumber()).toBe(2);
  });
});
