// tests/integration/ticket-materials.int.test.ts
// Materiales del ticket (AGENTS.md §2.8, §2.9 "Tickets: ver", regla 12): neto de salidas y devoluciones, con el
// alcance del ticket y sin ningún costo en el payload.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { listTicketMaterials } from "@/features/inventory/queries/list-ticket-materials";
import { dispatchItems } from "@/server/inventory/dispatch-items";
import { returnItems } from "@/server/inventory/return-items";
import { createInventoryFixture, d, postAll } from "./inventory-fixtures";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import { createTicketFixture } from "./ticket-fixtures";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("materiales del ticket", () => {
  it("muestra lo despachado menos lo devuelto, solo a quien ve el ticket y sin costos", async () => {
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
    const t = await createTicketFixture(db, []);
    const engineer = await createUserWithRoles(db, "Ingeniera", [
      { code: "INGENIERO", areaId: t.area.id },
    ]);
    await db.ticket.update({
      where: { id: t.ticket.id },
      data: { ownerId: engineer.id },
    });
    const out = await db.$transaction((tx) =>
      dispatchItems(tx, f.actorId, {
        warehouseId: f.origin.id,
        destination: { kind: "TICKET", ticketId: t.ticket.id },
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
        notes: "Sobró",
        idempotencyKey: randomUUID(),
      }),
    );

    const seen = await listTicketMaterials(engineer, t.ticket.id);
    expect(seen?.items).toEqual([
      expect.objectContaining({ code: f.plain.code, quantity: "2" }),
    ]);
    expect(seen?.documents.map((doc) => doc.kind)).toEqual([
      "DEVOLUCION",
      "SALIDA",
    ]);
    expect(seen?.canDownloadReceipts).toBe(false);
    expect(JSON.stringify(seen)).not.toMatch(/value|cost|Usd/i);

    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);
    expect(await listTicketMaterials(admin, t.ticket.id)).toBeNull();
    const gg = await createUserWithRoles(db, "GG", [
      { code: "GERENTE_GENERAL" },
    ]);
    expect(
      (await listTicketMaterials(gg, t.ticket.id))?.canDownloadReceipts,
    ).toBe(true);
  });
});
