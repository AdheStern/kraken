// tests/integration/inventory-dispatch.int.test.ts
// Salidas y devoluciones (AGENTS.md §2.8): la salida a un CV consume su reserva; a ticket o uso interno solo toma
// lo disponible; la devolución vuelve al costo de la salida, con tope, y reabre la reserva.
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { afterAll, describe, expect, it } from "vitest";
import {
  type DispatchDestination,
  dispatchItems,
} from "@/server/inventory/dispatch-items";
import { lockStocks } from "@/server/inventory/lock-stocks";
import { postReservationMovement } from "@/server/inventory/post-reservation-movement";
import { returnItems } from "@/server/inventory/return-items";
import { resolveInboundSerials } from "@/server/inventory/serial-units";
import {
  createInventoryFixture,
  d,
  postAll,
  reconcile,
} from "./inventory-fixtures";
import { createTestPrisma } from "./test-db";
import { createTicketFixture } from "./ticket-fixtures";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Fixture = Awaited<ReturnType<typeof createInventoryFixture>>;

async function withStock(quantity: number, valueUsd: number) {
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
          quantity: d(quantity),
          valueUsd: d(valueUsd),
        },
      ],
    },
  ]);
  return f;
}

async function reserve(f: Fixture, quantity: number) {
  const cvLine = await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      kind: "ITEM",
      areaId: f.area.id,
      description: "Switch",
      quantity: String(quantity),
      productId: f.plain.id,
      supplyMode: "STOCK_DIMA",
    },
  });
  return db.$transaction(async (tx) => {
    const key = { warehouseId: f.origin.id, productId: f.plain.id };
    const locked = await lockStocks(tx, [key]);
    return postReservationMovement(tx, locked, {
      kind: "CREAR",
      cvLineId: cvLine.id,
      originLineId: cvLine.id,
      ...key,
      quantity: d(quantity),
      actorId: f.actorId,
    });
  });
}

function dispatch(
  f: Fixture,
  destination: DispatchDestination,
  quantity: number,
  serials: string[] = [],
  productId = f.plain.id,
) {
  return db.$transaction((tx) =>
    dispatchItems(tx, f.actorId, {
      warehouseId: f.origin.id,
      destination,
      notes: null,
      idempotencyKey: randomUUID(),
      lines: [{ productId, quantity: d(quantity), serials }],
    }),
  );
}

const stockOf = (f: Fixture, productId = f.plain.id) =>
  reconcile(db, { warehouseId: f.origin.id, productId });

describe("salidas", () => {
  it("a un CV consume su reserva y no pasa de lo pendiente", async () => {
    const f = await withStock(3, 300);
    const { reservationId } = await reserve(f, 2);
    await expect(dispatch(f, { kind: "CV", reservationId }, 3)).rejects.toThrow(
      /La reserva cubre 2/,
    );
    await dispatch(f, { kind: "CV", reservationId }, 2);
    const reservation = await db.reservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect([
      reservation.status,
      reservation.consumedQuantity.toNumber(),
    ]).toEqual(["CONSUMIDA", 2]);
    const stock = await stockOf(f);
    expect([
      stock.quantity.toNumber(),
      stock.reservedQuantity.toNumber(),
      stock.matches,
    ]).toEqual([1, 0, true]);
  });

  it("a uso interno o a un ticket solo toma lo disponible, y el ticket debe estar abierto", async () => {
    const f = await withStock(3, 300);
    await reserve(f, 2);
    const internal = {
      kind: "INTERNO" as const,
      reason: "Laboratorio de pruebas",
    };
    await expect(dispatch(f, internal, 2)).rejects.toThrow(/hay 1 disponibles/);
    await dispatch(f, internal, 1);
    const t = await createTicketFixture(db, []);
    await db.ticket.update({
      where: { id: t.ticket.id },
      data: { status: "CERRADO" },
    });
    await expect(
      dispatch(f, { kind: "TICKET", ticketId: t.ticket.id }, 1),
    ).rejects.toThrow(/ya no está abierto/);
  });

  it("un serializado sale con su serial y vuelve con él", async () => {
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
    await expect(
      dispatch(
        f,
        { kind: "INTERNO", reason: "Demo cliente" },
        1,
        ["OTRO"],
        f.serialized.id,
      ),
    ).rejects.toThrow(/no están en el almacén: OTRO/);
    const out = await dispatch(
      f,
      { kind: "INTERNO", reason: "Demo cliente" },
      1,
      [serial],
      f.serialized.id,
    );
    const line = await db.invMovementLine.findFirstOrThrow({
      where: { movementId: out.movementId },
    });
    await db.$transaction((tx) =>
      returnItems(tx, f.actorId, {
        movementId: out.movementId,
        lines: [{ lineId: line.id, quantity: new Decimal(1) }],
        notes: null,
        idempotencyKey: randomUUID(),
      }),
    );
    const unit = await db.serialUnit.findUniqueOrThrow({
      where: { id: ids.get(serial) as string },
    });
    expect([unit.status, unit.warehouseId]).toEqual(["EN_STOCK", f.origin.id]);
    expect((await stockOf(f, f.serialized.id)).valueUsd.toFixed(2)).toBe(
      "900.00",
    );
  });
});

describe("devoluciones", () => {
  it("vuelven al costo de la salida en porciones exactas, con tope, y reabren la reserva", async () => {
    const f = await withStock(3, 100);
    const { reservationId } = await reserve(f, 3);
    const out = await dispatch(f, { kind: "CV", reservationId }, 3);
    const line = await db.invMovementLine.findFirstOrThrow({
      where: { movementId: out.movementId },
    });
    const giveBack = (quantity: number) =>
      db.$transaction((tx) =>
        returnItems(tx, f.actorId, {
          movementId: out.movementId,
          lines: [{ lineId: line.id, quantity: d(quantity) }],
          notes: "Sobró en obra",
          idempotencyKey: randomUUID(),
        }),
      );
    await giveBack(1);
    await giveBack(2);
    await expect(giveBack(1)).rejects.toThrow(/ya volvieron 3/);
    const stock = await stockOf(f);
    expect([
      stock.quantity.toNumber(),
      stock.valueUsd.toFixed(2),
      stock.matches,
    ]).toEqual([3, "100.00", true]);
    const reservation = await db.reservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect([
      reservation.status,
      reservation.consumedQuantity.toNumber(),
    ]).toEqual(["ACTIVA", 0]);
    expect(stock.reservedQuantity.toNumber()).toBe(3);
  });
});
