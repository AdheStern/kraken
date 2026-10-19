// tests/integration/ticket-reopen.int.test.ts
// Reapertura de un ticket contra la base (AGENTS.md §2.6, §8): REVERSO de sus consumos, consumo firme en
// bolsas terminales sin cobrar dos veces al volver a cerrar, pendiente descartado y reaperturas simultáneas.
import { afterAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { closeTicketHours } from "@/server/tickets/close-ticket-hours";
import { reopenTicketHours } from "@/server/tickets/reopen-ticket-hours";
import { createTestPrisma } from "./test-db";
import { addTimeEntry, createTicketFixture, ledgerOf } from "./ticket-fixtures";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-10-20T15:00:00Z");
const close = (user: SessionUser, ticketId: string) =>
  db.$transaction((tx) => closeTicketHours(tx, user, { ticketId }, NOW));
const reopen = (user: SessionUser, ticketId: string) =>
  db.$transaction((tx) =>
    reopenTicketHours(tx, user, { ticketId, reason: "Cliente no conforme" }),
  );
const resolve = (ticketId: string) =>
  db.ticket.update({ where: { id: ticketId }, data: { status: "RESUELTO" } });

// HORAS-01: P1 8x5 con 180 y P2 8x5 con 600; al cerrar quedan en 0 y 510.
async function closedHoras01() {
  const f = await createTicketFixture(db, [
    { modality: "H8X5", minutes: 180 },
    { modality: "H8X5", minutes: 600 },
  ]);
  await addTimeEntry(db, f.ticket.id, "2026-10-16T17:30", "2026-10-16T18:00");
  await addTimeEntry(db, f.ticket.id, "2026-10-16T18:15", "2026-10-16T19:30");
  await addTimeEntry(db, f.ticket.id, "2026-10-17T10:00", "2026-10-17T10:40");
  expect((await close(f.coordinator, f.ticket.id)).ok).toBe(true);
  return f;
}

describe("reopenTicketHours", () => {
  it("revierte los consumos y al volver a cerrar descuenta lo mismo", async () => {
    const f = await closedHoras01();
    const [p1, p2] = f.bags;

    expect(await reopen(f.coordinator, f.ticket.id)).toEqual({
      ok: true,
      data: {
        reversedMinutes: 270,
        keptMinutes: 0,
        discardedPending: [],
      },
    });
    expect(await ledgerOf(db, p1.id)).toEqual({
      balance: 180,
      status: "ACTIVA",
      ledger: 180,
    });
    expect(await ledgerOf(db, p2.id)).toMatchObject({
      balance: 600,
      ledger: 600,
    });
    expect(
      await db.ticket.findUniqueOrThrow({ where: { id: f.ticket.id } }),
    ).toMatchObject({ status: "EN_PROGRESO", closedAt: null });

    await resolve(f.ticket.id);
    const again = await close(f.coordinator, f.ticket.id);
    expect(again).toMatchObject({ ok: true, data: { chargedMinutes: 270 } });
    expect(await ledgerOf(db, p2.id)).toMatchObject({
      balance: 510,
      ledger: 510,
    });
  });

  it("el consumo en una bolsa vencida queda firme y no se cobra dos veces", async () => {
    const f = await closedHoras01();
    const [p1, p2] = f.bags;
    await db.$transaction((tx) =>
      postHourMovement(tx, {
        bagId: p1.id,
        kind: "VENCIMIENTO",
        minutes: 0,
        actorId: null,
        endAs: "VENCIDA",
      }),
    );

    expect(await reopen(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: { reversedMinutes: 90, keptMinutes: 180 },
    });
    expect(await ledgerOf(db, p2.id)).toMatchObject({ balance: 600 });

    await resolve(f.ticket.id);
    const again = await close(f.coordinator, f.ticket.id);
    expect(again).toMatchObject({
      ok: true,
      data: {
        chargedMinutes: 90,
        consumptions: [{ bagId: p2.id, minutes: 90 }],
      },
    });
    expect(
      await db.hourMovement.count({
        where: { ticketId: f.ticket.id, bagId: p1.id, kind: "CONSUMO" },
      }),
    ).toBe(1);
    expect(await ledgerOf(db, p2.id)).toMatchObject({
      balance: 510,
      ledger: 510,
    });
  });

  it("descarta el pendiente sin bolsa, aplicado o no, que se recalcula al volver a cerrar", async () => {
    const f = await createTicketFixture(db, []);
    await addTimeEntry(db, f.ticket.id, "2026-10-19T10:00", "2026-10-19T11:00");
    await close(f.coordinator, f.ticket.id);
    await db.pendingHours.create({
      data: {
        ticketId: f.ticket.id,
        customerId: f.customer.id,
        insideMinutes: 0,
        outsideMinutes: 20,
        status: "APLICADA",
      },
    });

    expect(await reopen(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: {
        discardedPending: [
          { insideMinutes: 60, outsideMinutes: 0, status: "PENDIENTE" },
          { insideMinutes: 0, outsideMinutes: 20, status: "APLICADA" },
        ],
      },
    });
    expect(
      await db.pendingHours.count({ where: { ticketId: f.ticket.id } }),
    ).toBe(0);
  });

  it("solo reabre un ticket cerrado, y dos reaperturas simultáneas revierten una sola vez", async () => {
    const f = await closedHoras01();
    const results = await Promise.all([
      reopen(f.coordinator, f.ticket.id),
      reopen(f.coordinator, f.ticket.id),
    ]);
    expect(results.map((r) => (r.ok ? "OK" : r.error.code)).sort()).toEqual([
      "INVALID_STATE",
      "OK",
    ]);
    expect(
      await db.hourMovement.count({
        where: { ticketId: f.ticket.id, kind: "REVERSO" },
      }),
    ).toBe(2);

    await resolve(f.ticket.id);
    const notClosed = await reopen(f.coordinator, f.ticket.id);
    expect(notClosed.ok ? "OK" : notClosed.error.code).toBe("INVALID_STATE");
  });
});
