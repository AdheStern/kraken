// tests/integration/inventory-receipt.int.test.ts
// Ingreso a un almacén (AGENTS.md §2.8): productos existentes y nuevos «por revisar», un serial por unidad,
// valor por línea, reintento idempotente y TRANSITO fuera del alcance.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  parseReceiptRows,
  type ReceiptDraftRow,
} from "@/domain/inventory/parse-receipt-rows";
import { registerReceipt } from "@/server/inventory/register-receipt";
import { createInventoryFixture, reconcile } from "./inventory-fixtures";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Fixture = Awaited<ReturnType<typeof createInventoryFixture>>;

function receive(
  f: Fixture,
  rows: ReceiptDraftRow[],
  over: { warehouseId?: string; idempotencyKey?: string } = {},
) {
  const { lines, issues } = parseReceiptRows(rows);
  expect(issues).toEqual([]);
  return db.$transaction((tx) =>
    registerReceipt(tx, f.actorId, {
      warehouseId: over.warehouseId ?? f.origin.id,
      origin: "INVENTARIO_INICIAL",
      documentRef: "PO-77",
      notes: null,
      idempotencyKey: over.idempotencyKey ?? randomUUID(),
      lines,
    }),
  );
}

const row = (
  code: string,
  quantity: string,
  unitCostUsd: string,
  serials = "",
): ReceiptDraftRow => ({
  code,
  description: `Equipo ${code}`,
  quantity,
  unitCostUsd,
  serials,
});

describe("registerReceipt", () => {
  it("ingresa productos existentes y crea los nuevos por revisar, con un serial por unidad", async () => {
    const f = await createInventoryFixture(db);
    const newCode = `NEW-${randomUUID().slice(0, 6).toUpperCase()}`;
    const serialA = `SA-${randomUUID().slice(0, 6)}`;
    const serialB = `SB-${randomUUID().slice(0, 6)}`;
    const ok = await receive(f, [
      row(f.plain.code.toLowerCase(), "3", "10.33"),
      row(newCode, "2", "450", `${serialA}, ${serialB}`),
    ]);
    expect(ok.createdProducts).toEqual([newCode]);
    const created = await db.product.findFirstOrThrow({
      where: { code: newCode },
    });
    expect([created.isSerialized, created.createdFromInventory]).toEqual([
      true,
      true,
    ]);
    const plain = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: f.plain.id,
    });
    expect([
      plain.quantity.toNumber(),
      plain.valueUsd.toFixed(2),
      plain.matches,
    ]).toEqual([3, "30.99", true]);
    const serialized = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: created.id,
    });
    expect([
      serialized.quantity.toNumber(),
      serialized.valueUsd.toFixed(2),
    ]).toEqual([2, "900.00"]);
    const units = await db.serialUnit.findMany({
      where: { productId: created.id },
    });
    expect(units.map((u) => [u.status, u.warehouseId])).toEqual([
      ["EN_STOCK", f.origin.id],
      ["EN_STOCK", f.origin.id],
    ]);
  });

  it("un reintento con la misma clave no registra dos veces", async () => {
    const f = await createInventoryFixture(db);
    const idempotencyKey = randomUUID();
    const first = await receive(f, [row(f.plain.code, "1", "5")], {
      idempotencyKey,
    });
    const second = await receive(f, [row(f.plain.code, "1", "5")], {
      idempotencyKey,
    });
    expect(second.number).toBe(first.number);
    const stock = await reconcile(db, {
      warehouseId: f.origin.id,
      productId: f.plain.id,
    });
    expect(stock.quantity.toNumber()).toBe(1);
  });

  it("exige seriales al serializado, los rechaza al que no lo es y no ingresa a TRANSITO", async () => {
    const f = await createInventoryFixture(db);
    await expect(
      receive(f, [row(f.serialized.code, "1", "5")]),
    ).rejects.toThrow(/es serializado/);
    await expect(
      receive(f, [row(f.plain.code, "1", "5", "S-1")]),
    ).rejects.toThrow(/no lleva serial/);
    await expect(
      receive(f, [row(f.plain.code, "1", "5")], { warehouseId: f.transit.id }),
    ).rejects.toThrow(/solo llegan traspasos/);
  });
});
