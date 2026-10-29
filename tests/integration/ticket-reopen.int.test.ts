// tests/integration/ticket-reopen.int.test.ts
// Reapertura de un ticket contra la base (AGENTS.md §2.6, §8): lo descontado queda firme y al volver a cerrar
// solo se cobra la diferencia (decisión 2026-10-29), pendiente no aplicado descartado y reaperturas simultáneas.
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
  db.$transaction((tx) => reopenTicketHours(tx, user, { ticketId }, NOW));
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
  it("no devuelve horas: las bolsas quedan como al cerrar y volver a cerrar sin trabajo nuevo no cobra", async () => {
    const f = await closedHoras01();
    const [p1, p2] = f.bags;

    expect(await reopen(f.coordinator, f.ticket.id)).toEqual({
      ok: true,
      data: { keptMinutes: 270, discardedPending: [] },
    });
    expect(await ledgerOf(db, p1.id)).toEqual({
      balance: 0,
      status: "AGOTADA",
      ledger: 0,
    });
    expect(await ledgerOf(db, p2.id)).toMatchObject({ balance: 510 });
    expect(
      await db.hourMovement.count({
        where: { ticketId: f.ticket.id, kind: "REVERSO" },
      }),
    ).toBe(0);
    expect(
      await db.ticket.findUniqueOrThrow({ where: { id: f.ticket.id } }),
    ).toMatchObject({ status: "EN_PROGRESO", closedAt: null });

    await resolve(f.ticket.id);
    expect(await close(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: { chargedMinutes: 0, consumptions: [] },
    });
    expect(await ledgerOf(db, p2.id)).toMatchObject({
      balance: 510,
      ledger: 510,
    });
  });

  // POR QUÉ: caso de staging (2026-10-29): 263 min reales cobrados como 270; reabrir no debe devolverlos.
  it("263 min cobrados como 270: +5 min no cobra nada y +20 min más cobra solo 30", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    const [bag] = f.bags;
    await addTimeEntry(db, f.ticket.id, "2026-10-19T09:00", "2026-10-19T13:23");
    expect(await close(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: { chargedMinutes: 270 },
    });

    await reopen(f.coordinator, f.ticket.id);
    expect(await ledgerOf(db, bag.id)).toMatchObject({ balance: 330 });
    await addTimeEntry(db, f.ticket.id, "2026-10-20T09:00", "2026-10-20T09:05");
    await resolve(f.ticket.id);
    expect(await close(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: { chargedMinutes: 0 },
    });

    await reopen(f.coordinator, f.ticket.id);
    await addTimeEntry(db, f.ticket.id, "2026-10-20T10:00", "2026-10-20T10:20");
    await resolve(f.ticket.id);
    expect(await close(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: {
        chargedMinutes: 30,
        consumptions: [{ bagId: bag.id, minutes: 30 }],
      },
    });
    expect(await ledgerOf(db, bag.id)).toMatchObject({
      balance: 300,
      ledger: 300,
    });
  });

  it("lo firme en una bolsa vencida tampoco se cobra dos veces y el trabajo nuevo va a la activa", async () => {
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
      data: { keptMinutes: 270 },
    });
    await addTimeEntry(db, f.ticket.id, "2026-10-19T09:00", "2026-10-19T09:30");
    await resolve(f.ticket.id);
    expect(await close(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: {
        chargedMinutes: 30,
        consumptions: [{ bagId: p2.id, minutes: 30 }],
      },
    });
    expect(
      await db.hourMovement.count({
        where: { ticketId: f.ticket.id, bagId: p1.id, kind: "CONSUMO" },
      }),
    ).toBe(1);
    expect(await ledgerOf(db, p2.id)).toMatchObject({
      balance: 480,
      ledger: 480,
    });
  });

  it("descarta el pendiente sin aplicar, conserva el aplicado y lo recalcula al volver a cerrar", async () => {
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
      data: { discardedPending: [{ insideMinutes: 60, outsideMinutes: 0 }] },
    });
    expect(
      await db.pendingHours.findMany({
        where: { ticketId: f.ticket.id },
        select: { status: true },
      }),
    ).toEqual([{ status: "APLICADA" }]);

    await resolve(f.ticket.id);
    expect(await close(f.coordinator, f.ticket.id)).toMatchObject({
      ok: true,
      data: { pendingMinutes: 60 },
    });
  });

  it("solo reabre un ticket cerrado, y dos reaperturas simultáneas reabren una sola vez", async () => {
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
      await db.ticketStatusEvent.count({
        where: { ticketId: f.ticket.id, fromStatus: "CERRADO" },
      }),
    ).toBe(1);

    await resolve(f.ticket.id);
    const notClosed = await reopen(f.coordinator, f.ticket.id);
    expect(notClosed.ok ? "OK" : notClosed.error.code).toBe("INVALID_STATE");
  });
});
