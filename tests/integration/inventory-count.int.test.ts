// tests/integration/inventory-count.int.test.ts
// Conteo físico (AGENTS.md §2.8): la foto es la del libro al empezar, así lo movido después no genera diferencia;
// sin diferencias no se pide nada; con ellas se pide el ajuste por delta y, aprobado, el stock queda como se contó.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { decideAdjustment } from "@/server/inventory/adjustments/decide-adjustment";
import { submitCount } from "@/server/inventory/count/submit-count";
import { dispatchItems } from "@/server/inventory/dispatch-items";
import { resolveInboundSerials } from "@/server/inventory/serial-units";
import {
  createInventoryFixture,
  d,
  postAll,
  reconcile,
} from "./inventory-fixtures";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fixture = Awaited<ReturnType<typeof createInventoryFixture>>;

async function receivePlain(f: Fixture, quantity: number, valueUsd: number) {
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
}

const count = (
  f: Fixture,
  startedAt: Date,
  items: { code: string; quantity: string; serials?: string[] }[],
  scope: "COMPLETO" | "PARCIAL" = "PARCIAL",
) =>
  db.$transaction((tx) =>
    submitCount(tx, f.actorId, {
      warehouseId: f.origin.id,
      scope,
      startedAt,
      items: items.map((i) => ({
        code: i.code,
        quantity: d(i.quantity),
        serials: i.serials ?? [],
        unitCostUsd: null,
      })),
    }),
  );

describe("conteo físico", () => {
  it("lo que se mueve después de empezar no es diferencia; sin diferencias no pide ajuste", async () => {
    const f = await createInventoryFixture(db);
    await receivePlain(f, 5, 50);
    await sleep(1100);
    const startedAt = new Date();
    await sleep(1100);
    await db.$transaction((tx) =>
      dispatchItems(tx, f.actorId, {
        warehouseId: f.origin.id,
        destination: { kind: "INTERNO", reason: "Demo durante el conteo" },
        notes: null,
        idempotencyKey: randomUUID(),
        lines: [{ productId: f.plain.id, quantity: d(1), serials: [] }],
      }),
    );
    expect(
      await count(f, startedAt, [{ code: f.plain.code, quantity: "5" }]),
    ).toEqual({ requestId: null, differences: 0 });
  });

  it("con diferencias pide el ajuste por delta y, aprobado, el stock queda como se contó", async () => {
    const f = await createInventoryFixture(db);
    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);
    await receivePlain(f, 5, 50);
    const known = `SN-${randomUUID().slice(0, 6)}`;
    const ids = await db.$transaction((tx) =>
      resolveInboundSerials(tx, f.serialized.id, [known]),
    );
    await postAll(db, [
      {
        kind: "INGRESO",
        receiptOrigin: "INVENTARIO_INICIAL",
        warehouseId: f.origin.id,
        actorId: f.actorId,
        lines: [
          {
            productId: f.serialized.id,
            direction: "IN",
            quantity: d(1),
            valueUsd: d(900),
            serialUnitId: ids.get(known),
          },
        ],
      },
    ]);
    await sleep(1100);
    const extra = `SN-${randomUUID().slice(0, 6)}`;
    const result = await count(
      f,
      new Date(),
      [
        { code: f.plain.code, quantity: "3" },
        { code: f.serialized.code, quantity: "1", serials: [extra] },
      ],
      "COMPLETO",
    );
    expect(result.differences).toBe(2);
    const request = await db.adjustmentRequest.findUniqueOrThrow({
      where: { id: result.requestId as string },
    });
    expect(request.origin).toBe("CONTEO");
    await db.$transaction((tx) =>
      decideAdjustment(tx, admin.id, {
        requestId: request.id,
        approve: true,
        comment: "",
      }),
    );
    const plain = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: f.plain.id,
    });
    expect([
      plain.quantity.toNumber(),
      plain.valueUsd.toFixed(2),
      plain.matches,
    ]).toEqual([3, "30.00", true]);
    const units = await db.serialUnit.findMany({
      where: { productId: f.serialized.id },
      orderBy: { serial: "asc" },
    });
    const status = Object.fromEntries(units.map((u) => [u.serial, u.status]));
    expect([status[known], status[extra]]).toEqual(["BAJA", "EN_STOCK"]);
  });
});
