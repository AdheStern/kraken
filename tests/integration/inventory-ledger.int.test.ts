// tests/integration/inventory-ledger.int.test.ts
// Libro de inventario (AGENTS.md §2.8, ADR-03, §11): valorización y kardex, conciliación caché vs libro, sobregiro
// imposible bajo concurrencia, traspaso cruzado sin interbloqueo, seriales e idempotencia.
import { afterAll, describe, expect, it } from "vitest";
import { InsufficientStockError } from "@/server/inventory/inventory-errors";
import { resolveInboundSerials } from "@/server/inventory/serial-units";
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

function receipt(
  f: Fixture,
  quantity: number,
  valueUsd: string,
  warehouseId = f.origin.id,
) {
  return {
    kind: "INGRESO" as const,
    receiptOrigin: "COMPRA_LOCAL" as const,
    warehouseId,
    actorId: f.actorId,
    lines: [
      {
        productId: f.plain.id,
        direction: "IN" as const,
        quantity: d(quantity),
        valueUsd: d(valueUsd),
      },
    ],
  };
}

function dispatch(f: Fixture, quantity: number, warehouseId = f.origin.id) {
  return {
    kind: "SALIDA" as const,
    warehouseId,
    actorId: f.actorId,
    lines: [
      {
        productId: f.plain.id,
        direction: "OUT" as const,
        quantity: d(quantity),
      },
    ],
  };
}

describe("libro de inventario", () => {
  it("valoriza al promedio, escribe el kardex y la caché coincide con el libro", async () => {
    const f = await createInventoryFixture(db);
    await postAll(db, [receipt(f, 3, "300"), receipt(f, 1, "120")]);
    const [out] = await postAll(db, [dispatch(f, 2)]);
    expect(out.lines[0].valueUsd.toFixed(2)).toBe("-210.00");
    const line = await db.invMovementLine.findUniqueOrThrow({
      where: { id: out.lines[0].lineId },
    });
    expect([
      line.balanceQuantity.toString(),
      line.balanceValueUsd.toString(),
    ]).toEqual(["2", "210"]);
    const stock = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: f.plain.id,
    });
    expect(stock.matches).toBe(true);
    expect(stock.valueUsd.toFixed(2)).toBe("210.00");
  });

  it("no sale más que el stock y no deja nada escrito", async () => {
    const f = await createInventoryFixture(db);
    await postAll(db, [receipt(f, 1, "50")]);
    await expect(postAll(db, [dispatch(f, 2)])).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
    expect(
      await db.invMovement.count({ where: { warehouseId: f.origin.id } }),
    ).toBe(1);
  });

  it("dos salidas simultáneas sobre el mismo stock: una gana, nunca saldo negativo", async () => {
    const f = await createInventoryFixture(db);
    await postAll(db, [receipt(f, 5, "500")]);
    const results = await Promise.allSettled([
      postAll(db, [dispatch(f, 3)]),
      postAll(db, [dispatch(f, 3)]),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    const stock = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: f.plain.id,
    });
    expect([stock.quantity.toNumber(), stock.matches]).toEqual([2, true]);
  });

  it("un envío y una recepción cruzados por TRANSITO no se interbloquean", async () => {
    const f = await createInventoryFixture(db);
    await postAll(db, [
      receipt(f, 4, "400"),
      receipt(f, 4, "800", f.destination.id),
    ]);
    const transfer = (from: string, to: string, valueUsd: string) =>
      postAll(db, [
        { ...dispatch(f, 1, from), kind: "TRASPASO" as const },
        {
          ...receipt(f, 1, valueUsd, to),
          kind: "TRASPASO" as const,
          receiptOrigin: undefined,
        },
      ]);
    const results = await Promise.allSettled([
      transfer(f.origin.id, f.transit.id, "100"),
      transfer(f.destination.id, f.transit.id, "200"),
      transfer(f.origin.id, f.destination.id, "100"),
      transfer(f.destination.id, f.origin.id, "200"),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    for (const warehouseId of [f.origin.id, f.destination.id, f.transit.id])
      expect(
        (await reconcile(db, { warehouseId, productId: f.plain.id })).matches,
      ).toBe(true);
  });

  it("lo que sale de TRANSITO vale lo de su traspaso, no el promedio", async () => {
    const f = await createInventoryFixture(db);
    await postAll(db, [
      {
        ...receipt(f, 1, "100", f.transit.id),
        kind: "TRASPASO" as const,
        receiptOrigin: undefined,
      },
      {
        ...receipt(f, 1, "120", f.transit.id),
        kind: "TRASPASO" as const,
        receiptOrigin: undefined,
      },
    ]);
    const [, arrival] = await postAll(db, [
      {
        ...dispatch(f, 1, f.transit.id),
        kind: "TRASPASO" as const,
        lines: [
          {
            productId: f.plain.id,
            direction: "OUT" as const,
            quantity: d(1),
            valueUsd: d(120),
          },
        ],
      },
      {
        ...receipt(f, 1, "120", f.destination.id),
        kind: "TRASPASO" as const,
        receiptOrigin: undefined,
      },
    ]);
    expect(arrival.lines[0].valueUsd.toFixed(2)).toBe("120.00");
    const transit = await reconcile(db, {
      warehouseId: f.transit.id,
      productId: f.plain.id,
    });
    expect([transit.valueUsd.toFixed(2), transit.matches]).toEqual([
      "100.00",
      true,
    ]);
  });
});

describe("seriales e idempotencia", () => {
  it("un serial sale del almacén donde está, vuelve reutilizando su fila y no entra dos veces", async () => {
    const f = await createInventoryFixture(db);
    const serials = await db.$transaction((tx) =>
      resolveInboundSerials(tx, f.serialized.id, ["SN-1"]),
    );
    const serialUnitId = serials.get("SN-1") as string;
    const line = { productId: f.serialized.id, quantity: d(1), serialUnitId };
    const inbound = {
      ...receipt(f, 1, "900"),
      lines: [{ ...line, direction: "IN" as const, valueUsd: d(900) }],
    };
    await postAll(db, [inbound]);
    await expect(
      postAll(db, [{ ...inbound, warehouseId: f.destination.id }]),
    ).rejects.toThrow(/ya está en un almacén/);
    await postAll(db, [
      { ...dispatch(f, 1), lines: [{ ...line, direction: "OUT" as const }] },
    ]);
    expect(
      (await db.serialUnit.findUniqueOrThrow({ where: { id: serialUnitId } }))
        .status,
    ).toBe("DESPACHADO");
    const again = await db.$transaction((tx) =>
      resolveInboundSerials(tx, f.serialized.id, [" SN-1 "]),
    );
    expect(again.get("SN-1")).toBe(serialUnitId);
    await expect(
      postAll(db, [
        {
          ...inbound,
          lines: [{ ...inbound.lines[0], serialUnitId: undefined }],
        },
      ]),
    ).rejects.toThrow(/serializado/);
  });

  it("la misma clave de idempotencia no registra dos veces", async () => {
    const f = await createInventoryFixture(db);
    const once = {
      ...receipt(f, 1, "10"),
      idempotencyKey: `pos-${f.origin.id}`,
    };
    await postAll(db, [once]);
    await expect(postAll(db, [once])).rejects.toMatchObject({ code: "P2002" });
  });

  it("el libro es inmutable", async () => {
    const f = await createInventoryFixture(db);
    const [posted] = await postAll(db, [receipt(f, 1, "10")]);
    const where = { id: posted.lines[0].lineId };
    await expect(
      db.invMovementLine.update({ where, data: { quantity: "5" } }),
    ).rejects.toThrow(/inmutable/);
    await expect(db.invMovementLine.delete({ where })).rejects.toThrow(
      /inmutable/,
    );
  });
});
