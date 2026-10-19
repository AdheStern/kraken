// tests/integration/ticket-close.int.test.ts
// Cierre de un ticket contra la base (AGENTS.md §2.6, §3 flujo de cierre, §11 concurrencia): HORAS-01 de
// punta a punta, rechazos, pendiente sin bolsa y cierres simultáneos que nunca sobregiran una bolsa.
import { afterAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { closeTicketHours } from "@/server/tickets/close-ticket-hours";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import {
  addTimeEntry,
  addTimerEvents,
  createTicket,
  createTicketFixture,
  ledgerOf,
} from "./ticket-fixtures";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-10-20T15:00:00Z");
const close = (user: SessionUser, ticketId: string) =>
  db.$transaction((tx) => closeTicketHours(tx, user, { ticketId }, NOW));

describe("closeTicketHours", () => {
  it("HORAS-01: P1 −180 (AGOTADA, aviso de 100 %) y P2 −90 (saldo 510)", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 180 },
      { modality: "H8X5", minutes: 600 },
    ]);
    const [p1, p2] = f.bags;
    await addTimeEntry(db, f.ticket.id, "2026-10-16T17:30", "2026-10-16T18:00");
    await addTimeEntry(db, f.ticket.id, "2026-10-16T18:15", "2026-10-16T19:30");
    await addTimeEntry(db, f.ticket.id, "2026-10-17T10:00", "2026-10-17T10:40");

    const result = await close(f.coordinator, f.ticket.id);
    expect(result).toEqual({
      ok: true,
      data: {
        chargedMinutes: 270,
        pendingMinutes: 0,
        waivedMinutes: 0,
        consumptions: [
          { bagId: p1.id, minutes: 180 },
          { bagId: p2.id, minutes: 90 },
        ],
      },
    });
    expect(await ledgerOf(db, p1.id)).toEqual({
      balance: 0,
      status: "AGOTADA",
      ledger: 0,
    });
    expect(await ledgerOf(db, p2.id)).toEqual({
      balance: 510,
      status: "ACTIVA",
      ledger: 510,
    });
    expect(
      await db.inboxItem.count({
        where: { eventType: "BOLSA_AGOTADA", link: `/horas/${p1.id}` },
      }),
    ).toBeGreaterThan(0);
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { id: f.ticket.id },
    });
    expect(ticket).toMatchObject({ status: "CERRADO", closedAt: NOW });
  });

  it("sin bolsas todo va a pendiente sin bolsa y avisa al gerente del área", async () => {
    const f = await createTicketFixture(db, []);
    const manager = await createUserWithRoles(db, "Gerente", [
      { code: "GERENTE_AREA", areaId: f.area.id },
    ]);
    await addTimeEntry(db, f.ticket.id, "2026-10-19T10:00", "2026-10-19T11:00");

    const result = await close(f.coordinator, f.ticket.id);
    expect(result).toMatchObject({ ok: true, data: { pendingMinutes: 60 } });
    expect(
      await db.pendingHours.findMany({
        where: { ticketId: f.ticket.id },
        select: { insideMinutes: true, outsideMinutes: true, status: true },
      }),
    ).toEqual([{ insideMinutes: 60, outsideMinutes: 0, status: "PENDIENTE" }]);
    expect(
      await db.inboxItem.count({
        where: { userId: manager.id, eventType: "HORAS_PENDIENTES" },
      }),
    ).toBe(1);
  });

  it("rechaza un ticket no resuelto, con tiempo en curso o a quien no puede cerrar", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 60 },
    ]);
    const inProgress = await createTicket(db, f, [], "EN_PROGRESO");
    const withOpenEntry = await createTicket(db, f, []);
    await addTimeEntry(db, withOpenEntry.id, "2026-10-19T09:00", null);
    const withPausedTimer = await createTicket(db, f, []);
    await addTimerEvents(db, withPausedTimer.id, ["INICIAR", "PAUSAR"]);
    const engineer = await createUserWithRoles(db, "Ingeniero", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);

    const code = async (user: SessionUser, ticketId: string) => {
      const result = await close(user, ticketId);
      return result.ok ? "OK" : result.error.code;
    };
    expect(await code(f.coordinator, inProgress.id)).toBe("INVALID_STATE");
    expect(await code(f.coordinator, withOpenEntry.id)).toBe("INVALID_STATE");
    expect(await code(f.coordinator, withPausedTimer.id)).toBe("INVALID_STATE");
    expect(await code(engineer, f.ticket.id)).toBe("FORBIDDEN");
  });

  it("dos tickets cierran a la vez contra la misma bolsa: ambos cierran y el saldo nunca es negativo", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 180 },
    ]);
    const [bag] = f.bags;
    const other = await createTicket(db, f, [bag.id]);
    for (const ticketId of [f.ticket.id, other.id])
      await addTimeEntry(db, ticketId, "2026-10-19T10:00", "2026-10-19T12:00");

    const results = await Promise.all([
      close(f.coordinator, f.ticket.id),
      close(f.coordinator, other.id),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await ledgerOf(db, bag.id)).toEqual({
      balance: 0,
      status: "AGOTADA",
      ledger: 0,
    });
    const pending = await db.pendingHours.findMany({
      where: { ticketId: { in: [f.ticket.id, other.id] } },
    });
    expect(pending.map((p) => p.insideMinutes)).toEqual([60]);
    // El vendedor del CV de la bolsa recibe el aviso de horas sin bolsa.
    expect(
      await db.inboxItem.count({
        where: { userId: f.userId, eventType: "HORAS_PENDIENTES" },
      }),
    ).toBe(1);
  });

  it("el mismo ticket cerrado dos veces a la vez: uno gana y descuenta una sola vez", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    await addTimeEntry(db, f.ticket.id, "2026-10-19T10:00", "2026-10-19T11:00");

    const results = await Promise.all([
      close(f.coordinator, f.ticket.id),
      close(f.coordinator, f.ticket.id),
    ]);
    expect(results.map((r) => (r.ok ? "OK" : r.error.code)).sort()).toEqual([
      "INVALID_STATE",
      "OK",
    ]);
    expect(
      await db.hourMovement.count({
        where: { ticketId: f.ticket.id, kind: "CONSUMO" },
      }),
    ).toBe(1);
    expect(await ledgerOf(db, f.bags[0].id)).toMatchObject({
      balance: 540,
      ledger: 540,
    });
  });
});
