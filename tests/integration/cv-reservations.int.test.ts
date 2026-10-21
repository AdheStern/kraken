// tests/integration/cv-reservations.int.test.ts
// Reservas de stock desde el CV (AGENTS.md §2.3, §2.8): reserva al aprobar con faltante avisado, ajuste y
// liberación por versión, envío bloqueado sin producto o por debajo de lo despachado, ciudad sin almacén,
// anulación y CV de saldo inicial.
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { lockStocks } from "@/server/inventory/lock-stocks";
import { postReservationMovement } from "@/server/inventory/post-reservation-movement";
import { decideRequest } from "@/server/sales-control/decide-request";
import { startNewVersion } from "@/server/sales-control/start-new-version";
import { submitVersion } from "@/server/sales-control/submit-version";
import { voidLatestVersion } from "@/server/sales-control/void-version";
import { d, postAll, reconcile } from "./inventory-fixtures";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const NOW = new Date("2026-10-21T15:00:00Z");

let area: { id: string };
let manager: SessionUser;
let seller: SessionUser;
let keeper: SessionUser;

beforeAll(async () => {
  area = await db.area.create({
    data: { code: `NET-${randomUUID().slice(0, 6)}`, name: "Red" },
  });
  manager = await createUserWithRoles(db, "Gerente", [
    { code: "GERENTE_AREA", areaId: area.id },
  ]);
  seller = await createUserWithRoles(db, "Comercial", [{ code: "COMERCIAL" }]);
  keeper = await createUserWithRoles(db, "Almacenero", [{ code: "ALMACEN" }]);
});

async function stockCv({
  quantity,
  inStock,
  withWarehouse = true,
  isOpeningBalance = false,
}: {
  quantity: string;
  inStock: number;
  withWarehouse?: boolean;
  isOpeningBalance?: boolean;
}) {
  const f = await createCvFixture(db);
  await db.cv.update({
    where: { id: f.cv.id },
    data: { createdById: seller.id, isOpeningBalance },
  });
  const product = await db.product.create({
    data: {
      code: `SW-${randomUUID().slice(0, 8)}`,
      description: "Switch",
      itemType: "HARDWARE",
    },
  });
  const warehouse = withWarehouse
    ? await db.warehouse.create({
        data: {
          code: `W-${randomUUID().slice(0, 8)}`,
          name: "Almacén",
          kind: "FISICO",
          cityId: f.city.id,
        },
      })
    : null;
  if (warehouse && inStock > 0)
    await postAll(db, [
      {
        kind: "INGRESO",
        receiptOrigin: "COMPRA_LOCAL",
        warehouseId: warehouse.id,
        actorId: keeper.id,
        lines: [
          {
            productId: product.id,
            direction: "IN",
            quantity: d(inStock),
            valueUsd: d(inStock * 100),
          },
        ],
      },
    ]);
  await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      kind: "ITEM",
      itemType: "HARDWARE",
      areaId: area.id,
      description: "Switch de acceso",
      productId: product.id,
      supplyMode: "STOCK_DIMA",
      quantity,
      unitCostUsd: "100",
      unitSaleUsd: "150",
      pricingSource: "PRECIO",
    },
  });
  return { ...f, product, warehouse };
}

const submit = (versionId: string) =>
  db.$transaction((tx) =>
    submitVersion(tx, seller, versionId, {
      thresholdUsd: "50000.00",
      now: NOW,
    }),
  );

async function approve(versionId: string) {
  const request = await db.cvApprovalRequest.findFirstOrThrow({
    where: { versionId, status: "PENDIENTE" },
  });
  return db.$transaction((tx) =>
    decideRequest(
      tx,
      manager,
      { requestId: request.id, decision: "APROBADA", comment: "" },
      NOW,
    ),
  );
}

async function approveFlow(versionId: string) {
  expect(await submit(versionId)).toMatchObject({ ok: true });
  expect(await approve(versionId)).toMatchObject({ ok: true });
}

async function newVersionWithQuantity(cvId: string, quantity: string | null) {
  await db.$transaction((tx) =>
    startNewVersion(tx, seller, { cvId, reason: "Cambio de cantidad" }),
  );
  const version = await db.cvVersion.findFirstOrThrow({
    where: { cvId },
    orderBy: { number: "desc" },
    include: { lines: true },
  });
  const [line] = version.lines;
  if (quantity === null)
    await db.cvLine.update({
      where: { id: line.id },
      data: { supplyMode: "LOCAL" },
    });
  else await db.cvLine.update({ where: { id: line.id }, data: { quantity } });
  return version;
}

const reservationsOf = (cvId: string) =>
  db.reservation.findMany({
    where: { cvLine: { version: { cvId } } },
    orderBy: { createdAt: "asc" },
  });

const inbox = (userId: string, eventType: string) =>
  db.inboxItem.count({ where: { userId, eventType } });

describe("reservas de stock desde el CV", () => {
  it("al aprobar reserva todo, aunque falte stock, y avisa el faltante", async () => {
    const f = await stockCv({ quantity: "3", inStock: 1 });
    await approveFlow(f.version.id);
    const [reservation] = await reservationsOf(f.cv.id);
    expect([reservation.status, reservation.quantity.toNumber()]).toEqual([
      "ACTIVA",
      3,
    ]);
    const key = {
      warehouseId: f.warehouse?.id as string,
      productId: f.product.id,
    };
    const stock = await reconcile(db, key);
    expect([stock.reservedQuantity.toNumber(), stock.matches]).toEqual([
      3,
      true,
    ]);
    expect(await inbox(keeper.id, "RESERVA_FALTANTE")).toBeGreaterThan(0);
  });

  it("una versión nueva ajusta por linaje y dejar de ser STOCK_DIMA libera", async () => {
    const f = await stockCv({ quantity: "3", inStock: 5 });
    await approveFlow(f.version.id);
    const v2 = await newVersionWithQuantity(f.cv.id, "2");
    await approveFlow(v2.id);
    let [reservation] = await reservationsOf(f.cv.id);
    expect([reservation.quantity.toNumber(), reservation.cvLineId]).toEqual([
      2,
      v2.lines[0].id,
    ]);
    const v3 = await newVersionWithQuantity(f.cv.id, null);
    await approveFlow(v3.id);
    [reservation] = await reservationsOf(f.cv.id);
    expect(reservation.status).toBe("LIBERADA");
    const stock = await reconcile(db, {
      warehouseId: f.warehouse?.id as string,
      productId: f.product.id,
    });
    expect([stock.reservedQuantity.toNumber(), stock.matches]).toEqual([
      0,
      true,
    ]);
  });

  it("no envía una línea de stock sin producto ni una versión por debajo de lo despachado", async () => {
    const f = await stockCv({ quantity: "2", inStock: 5 });
    await db.cvLine.updateMany({
      where: { versionId: f.version.id },
      data: { productId: null },
    });
    expect(await submit(f.version.id)).toMatchObject({
      ok: false,
      error: { message: expect.stringMatching(/elige su producto/) },
    });
    await db.cvLine.updateMany({
      where: { versionId: f.version.id },
      data: { productId: f.product.id },
    });
    await approveFlow(f.version.id);
    const [reservation] = await reservationsOf(f.cv.id);
    await db.$transaction(async (tx) => {
      const key = {
        warehouseId: reservation.warehouseId,
        productId: f.product.id,
      };
      const locked = await lockStocks(tx, [key]);
      const { postInvMovement } = await import(
        "@/server/inventory/post-inv-movement"
      );
      const out = await postInvMovement(tx, locked, {
        kind: "SALIDA",
        warehouseId: key.warehouseId,
        actorId: keeper.id,
        cvLineId: reservation.cvLineId,
        lines: [
          {
            productId: f.product.id,
            direction: "OUT",
            quantity: new Decimal(2),
          },
        ],
      });
      await postReservationMovement(tx, locked, {
        kind: "CONSUMIR",
        reservationId: reservation.id,
        quantity: new Decimal(2),
        invMovementLineId: out.lines[0].lineId,
        actorId: keeper.id,
      });
    });
    const v2 = await newVersionWithQuantity(f.cv.id, "1");
    expect(await submit(v2.id)).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
  });

  it("si la ciudad no tiene almacén aprueba igual, no reserva y avisa", async () => {
    const f = await stockCv({
      quantity: "1",
      inStock: 0,
      withWarehouse: false,
    });
    await approveFlow(f.version.id);
    expect(await reservationsOf(f.cv.id)).toEqual([]);
    expect(await inbox(keeper.id, "RESERVA_SIN_ALMACEN")).toBeGreaterThan(0);
  });

  it("anular la versión aprobada libera; un CV de saldo inicial no reserva", async () => {
    const f = await stockCv({ quantity: "2", inStock: 2 });
    await approveFlow(f.version.id);
    const voided = await db.$transaction((tx) =>
      voidLatestVersion(
        tx,
        seller,
        { cvId: f.cv.id, reason: "Cliente desistió" },
        NOW,
      ),
    );
    expect(voided).toMatchObject({ ok: true });
    expect((await reservationsOf(f.cv.id))[0].status).toBe("LIBERADA");
    const opening = await stockCv({
      quantity: "1",
      inStock: 1,
      isOpeningBalance: true,
    });
    await approveFlow(opening.version.id);
    expect(await reservationsOf(opening.cv.id)).toEqual([]);
  });
});
