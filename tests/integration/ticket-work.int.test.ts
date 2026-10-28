// tests/integration/ticket-work.int.test.ts
// Subtareas, jerarquía de bolsas, proyectos y aplicación del pendiente sin bolsa contra la base
// (AGENTS.md §2.6, §2.9).
import { afterAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { applyPendingHoursRecord } from "@/server/tickets/apply-pending-hours-record";
import { closeTicketHours } from "@/server/tickets/close-ticket-hours";
import { createProjectRecord } from "@/server/tickets/create-project-record";
import { createSubtaskRecord } from "@/server/tickets/create-subtask-record";
import { setTicketBagsRecord } from "@/server/tickets/set-ticket-bags";
import { updateSubtaskRecord } from "@/server/tickets/update-subtask-record";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import {
  addTimeEntry,
  createTicket,
  createTicketFixture,
  ledgerOf,
} from "./ticket-fixtures";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-10-20T15:00:00Z");
const run = <T>(work: (tx: Tx) => Promise<T>) => db.$transaction(work);
const code = (r: { ok: boolean; error?: { code: string } }) =>
  r.ok ? "OK" : r.error?.code;

async function engineerOf(areaId: string, name = "Ingeniera") {
  return createUserWithRoles(db, name, [{ code: "INGENIERO", areaId }]);
}

describe("subtareas", () => {
  it("el coordinador crea y asigna; el asignado completa la suya pero no la reasigna", async () => {
    const f = await createTicketFixture(db, []);
    const ticket = await createTicket(db, f, [], "EN_PROGRESO");
    const engineer = await engineerOf(f.area.id);
    const other = await engineerOf(f.area.id, "Otro");

    const created = await run((tx) =>
      createSubtaskRecord(tx, f.coordinator, {
        ticketId: ticket.id,
        title: "Revisar cableado",
        assigneeId: engineer.id,
      }),
    );
    if (!created.ok) throw new Error(created.error.message);
    const { subtaskId } = created.data;
    expect(
      await db.inboxItem.count({
        where: { userId: engineer.id, eventType: "TICKET_ASIGNADO" },
      }),
    ).toBe(1);

    const done = await run((tx) =>
      updateSubtaskRecord(
        tx,
        engineer,
        { subtaskId, status: "COMPLETADA" },
        NOW,
      ),
    );
    expect(code(done)).toBe("OK");
    const reassign = await run((tx) =>
      updateSubtaskRecord(
        tx,
        engineer,
        { subtaskId, assigneeId: other.id },
        NOW,
      ),
    );
    expect(code(reassign)).toBe("FORBIDDEN");
    expect(
      await db.subtask.findUniqueOrThrow({ where: { id: subtaskId } }),
    ).toMatchObject({ status: "COMPLETADA", completedAt: NOW });
  });

  it("el comercial no crea subtareas", async () => {
    const f = await createTicketFixture(db, []);
    const commercial = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    const result = await run((tx) =>
      createSubtaskRecord(tx, commercial, {
        ticketId: f.ticket.id,
        title: "Algo",
        assigneeId: null,
      }),
    );
    expect(code(result)).toBe("FORBIDDEN");
  });
});

describe("jerarquía de bolsas", () => {
  it("reordena conservando la marca de aviso, el SLA sigue a la prioridad 1 y rechaza una bolsa de otro cliente", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 60 },
      { modality: "H24X7", minutes: 60 },
    ]);
    const [b1, b2] = f.bags;
    await db.ticketBag.update({
      where: { ticketId_bagId: { ticketId: f.ticket.id, bagId: b1.id } },
      data: { projectionWarnedAt: NOW },
    });
    const set = (user: SessionUser, bagIds: string[]) =>
      run((tx) =>
        setTicketBagsRecord(tx, user, { ticketId: f.ticket.id, bagIds }),
      );

    expect(code(await set(f.coordinator, [b2.id, b1.id]))).toBe("OK");
    const rows = await db.ticketBag.findMany({
      where: { ticketId: f.ticket.id },
      orderBy: { priority: "asc" },
    });
    expect(rows.map((r) => [r.bagId, r.priority])).toEqual([
      [b2.id, 1],
      [b1.id, 2],
    ]);
    expect(rows[1].projectionWarnedAt).toEqual(NOW);
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { id: f.ticket.id },
    });
    expect(ticket.slaModality).toBe("H24X7");

    const foreign = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 60 },
    ]);
    expect(code(await set(f.coordinator, [foreign.bags[0].id]))).toBe(
      "VALIDATION",
    );
  });
});

describe("pendiente sin bolsa y proyectos", () => {
  it("aplica el pendiente ponderado con la modalidad de la bolsa, una sola vez", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    const ticket = await createTicket(db, f, []);
    await addTimeEntry(db, ticket.id, "2026-10-19T18:00", "2026-10-19T19:00");
    await run((tx) =>
      closeTicketHours(tx, f.coordinator, { ticketId: ticket.id }, NOW),
    );
    const pending = await db.pendingHours.findFirstOrThrow({
      where: { ticketId: ticket.id },
    });
    expect(pending).toMatchObject({ insideMinutes: 30, outsideMinutes: 30 });

    const apply = () =>
      run((tx) =>
        applyPendingHoursRecord(
          tx,
          f.coordinator,
          { pendingId: pending.id, bagId: f.bags[0].id },
          NOW,
        ),
      );
    expect(await apply()).toEqual({ ok: true, data: { minutes: 90 } });
    expect(code(await apply())).toBe("INVALID_STATE");
    expect(await ledgerOf(db, f.bags[0].id)).toMatchObject({
      balance: 510,
      ledger: 510,
    });
  });

  it("el coordinador crea proyectos de su área y el ingeniero no", async () => {
    const f = await createTicketFixture(db, []);
    const input = {
      name: "Migración del data center",
      customerId: f.customer.id,
      areaIds: [f.area.id],
      startsOn: "2026-11-01",
      endsOn: "2026-12-15",
    };
    expect(
      code(await run((tx) => createProjectRecord(tx, f.coordinator, input))),
    ).toBe("OK");
    const engineer = await engineerOf(f.area.id);
    expect(
      code(await run((tx) => createProjectRecord(tx, engineer, input))),
    ).toBe("FORBIDDEN");
  });
});
