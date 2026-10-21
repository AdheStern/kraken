// tests/integration/inventory-reservations.int.test.ts
// Libro de reservas (AGENTS.md §0.6, §2.8): crear, consumir, ajustar, reabrir y liberar mueven lo reservado del
// stock solo con su movimiento; la sobre-reserva se admite y la reserva liberada no se toca.
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "@/server/db";
import { lockStocks } from "@/server/inventory/lock-stocks";
import {
  postReservationMovement,
  type ReservationMovementInput,
} from "@/server/inventory/post-reservation-movement";
import {
  createInventoryFixture,
  d,
  postAll,
  reconcile,
} from "./inventory-fixtures";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Fixture = Awaited<ReturnType<typeof createInventoryFixture>>;

async function setup() {
  const f = await createInventoryFixture(db);
  const cvLine = await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      kind: "ITEM",
      areaId: f.area.id,
      description: "Switch",
      quantity: "3",
      productId: f.plain.id,
      supplyMode: "STOCK_DIMA",
    },
  });
  const key = { warehouseId: f.origin.id, productId: f.plain.id };
  return { f, cvLine, key };
}

function reserve(f: Fixture, input: ReservationMovementInput) {
  return db.$transaction(async (tx: Tx) => {
    const locked = await lockStocks(tx, [
      { warehouseId: f.origin.id, productId: f.plain.id },
    ]);
    return postReservationMovement(tx, locked, input);
  });
}

async function dispatchLine(f: Fixture) {
  const [posted] = await postAll(db, [
    {
      kind: "SALIDA",
      warehouseId: f.origin.id,
      actorId: f.actorId,
      lines: [{ productId: f.plain.id, direction: "OUT", quantity: d(1) }],
    },
  ]);
  return posted.lines[0].lineId;
}

describe("libro de reservas", () => {
  it("lleva lo reservado del stock solo con sus movimientos, también sobre-reservando", async () => {
    const { f, cvLine, key } = await setup();
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
            quantity: d(2),
            valueUsd: d(200),
          },
        ],
      },
    ]);
    const base = { actorId: f.actorId, versionId: f.version.id };
    const { reservationId } = await reserve(f, {
      ...base,
      kind: "CREAR",
      cvLineId: cvLine.id,
      originLineId: cvLine.id,
      ...key,
      quantity: d(3),
    });
    let stock = await reconcile(db, key);
    expect([
      stock.reservedQuantity.toNumber(),
      stock.quantity.toNumber(),
      stock.matches,
    ]).toEqual([3, 2, true]);

    const invMovementLineId = await dispatchLine(f);
    await reserve(f, {
      ...base,
      kind: "CONSUMIR",
      reservationId,
      quantity: d(1),
      invMovementLineId,
    });
    await reserve(f, {
      ...base,
      kind: "AJUSTE",
      reservationId,
      deltaQuantity: d(-2),
      cvLineId: cvLine.id,
    });
    let reservation = await db.reservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect(reservation.status).toBe("CONSUMIDA");
    stock = await reconcile(db, key);
    expect([stock.reservedQuantity.toNumber(), stock.matches]).toEqual([
      0,
      true,
    ]);

    await reserve(f, {
      ...base,
      kind: "REABRIR",
      reservationId,
      quantity: d(1),
      invMovementLineId,
    });
    reservation = await db.reservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect([
      reservation.status,
      (await reconcile(db, key)).reservedQuantity.toNumber(),
    ]).toEqual(["ACTIVA", 1]);
  });

  it("liberar sin despachos deja LIBERADA; con despachos recorta a lo despachado", async () => {
    const { f, cvLine, key } = await setup();
    const base = { actorId: f.actorId };
    const created = (quantity: number) =>
      reserve(f, {
        ...base,
        kind: "CREAR",
        cvLineId: cvLine.id,
        originLineId: cvLine.id,
        ...key,
        quantity: d(quantity),
      });
    const first = await created(2);
    await reserve(f, {
      ...base,
      kind: "LIBERAR",
      reservationId: first.reservationId,
    });
    expect(
      (
        await db.reservation.findUniqueOrThrow({
          where: { id: first.reservationId },
        })
      ).status,
    ).toBe("LIBERADA");
    await expect(
      reserve(f, {
        ...base,
        kind: "LIBERAR",
        reservationId: first.reservationId,
      }),
    ).rejects.toThrow(/ya fue liberada/);

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
            quantity: d(1),
            valueUsd: d(10),
          },
        ],
      },
    ]);
    const second = await created(3);
    const invMovementLineId = await dispatchLine(f);
    await reserve(f, {
      ...base,
      kind: "CONSUMIR",
      reservationId: second.reservationId,
      quantity: d(1),
      invMovementLineId,
    });
    await reserve(f, {
      ...base,
      kind: "LIBERAR",
      reservationId: second.reservationId,
    });
    const trimmed = await db.reservation.findUniqueOrThrow({
      where: { id: second.reservationId },
    });
    expect([trimmed.status, trimmed.quantity.toNumber()]).toEqual([
      "CONSUMIDA",
      1,
    ]);
    const stock = await reconcile(db, key);
    expect([stock.reservedQuantity.toNumber(), stock.matches]).toEqual([
      0,
      true,
    ]);
  });

  it("no consume más de lo que cubre la reserva", async () => {
    const { f, cvLine, key } = await setup();
    const { reservationId } = await reserve(f, {
      actorId: f.actorId,
      kind: "CREAR",
      cvLineId: cvLine.id,
      originLineId: cvLine.id,
      ...key,
      quantity: d(1),
    });
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
            quantity: d(2),
            valueUsd: d(20),
          },
        ],
      },
    ]);
    const invMovementLineId = await dispatchLine(f);
    await expect(
      reserve(f, {
        actorId: f.actorId,
        kind: "CONSUMIR",
        reservationId,
        quantity: d(2),
        invMovementLineId,
      }),
    ).rejects.toThrow(/no cubre/);
  });
});
