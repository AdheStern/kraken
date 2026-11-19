// tests/integration/historical-load.int.test.ts
// Carga histórica de trabajo previo contra la base (AGENTS.md §2.6, decisión 2026-11-19): el ticket cerrado
// nace con sus fechas reales y descuenta como un cierre normal; repetir la referencia no duplica; un solape o
// alguien sin permiso no deja nada escrito; los históricos no miden SLA ni quedan tardíos.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { HistoricalRow } from "@/domain/tickets/historical-row-parts";
import {
  type HistoricalTicket,
  parseHistoricalRows,
} from "@/domain/tickets/parse-historical-rows";
import type { SessionUser } from "@/server/authz/roles";
import { importHistoricalTicket } from "@/server/tickets/import-historical-ticket";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import { addTimeEntry, createTicketFixture, ledgerOf } from "./ticket-fixtures";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-11-19T16:00:00Z");
type Fixture = Awaited<ReturnType<typeof createTicketFixture>>;
let f: Fixture;
let engineer: SessionUser;

beforeAll(async () => {
  f = await createTicketFixture(db, [{ modality: "H8X5", minutes: 600 }]);
  engineer = await createUserWithRoles(db, "Ingeniera histórica", [
    { code: "INGENIERO", areaId: f.area.id },
  ]);
  await db.slaPolicy.upsert({
    where: { modality_priority: { modality: "H8X5", priority: "MEDIA" } },
    create: {
      modality: "H8X5",
      priority: "MEDIA",
      firstResponseMinutes: 240,
      resolutionMinutes: 1440,
    },
    update: { isActive: true },
  });
});

function parse(overrides: Partial<HistoricalRow>): HistoricalTicket {
  const { tickets, issues } = parseHistoricalRows(
    [
      {
        ref: "",
        openedOn: "19/10/2026",
        title: "Trabajo previo",
        description: "",
        customerId: f.customer.id,
        cityId: f.city.id,
        areaIds: [f.area.id],
        projectId: "",
        priority: "MEDIA",
        ownerId: engineer.id,
        status: "CERRADO",
        workDate: "19/10/2026",
        from: "09:00",
        to: "11:00",
        executorId: "",
        bagId: f.bags[0].id,
        closedOn: "",
        ...overrides,
      },
    ],
    NOW,
  );
  expect(issues).toEqual([]);
  return tickets[0];
}

const load = (user: SessionUser, ticket: HistoricalTicket) =>
  db.$transaction((tx) => importHistoricalTicket(tx, user, ticket));

describe("importHistoricalTicket", () => {
  it("un ticket cerrado nace con sus fechas, descuenta de la bolsa y no mide SLA", async () => {
    const ticket = parse({ ref: `H-${Date.now()}` });
    const result = await load(f.coordinator, ticket);
    expect(result).toMatchObject({
      ok: true,
      data: { outcome: "CREADO", chargedMinutes: 120, pendingMinutes: 0 },
    });
    if (!result.ok || result.data.outcome !== "CREADO") return;
    expect(await ledgerOf(db, f.bags[0].id)).toMatchObject({ balance: 480 });
    const saved = await db.ticket.findUniqueOrThrow({
      where: { id: result.data.ticketId },
      include: {
        statusEvents: { orderBy: { occurredAt: "asc" } },
        timeEntries: true,
        slaMeasurements: true,
      },
    });
    expect(saved).toMatchObject({
      status: "CERRADO",
      isHistorical: true,
      previousRef: ticket.ref,
      ownerId: engineer.id,
      createdAt: new Date("2026-10-19T13:00:00Z"),
      resolvedAt: new Date("2026-10-19T15:00:00Z"),
      closedAt: new Date("2026-10-19T15:00:00Z"),
    });
    expect(saved.statusEvents.map((e) => e.toStatus)).toEqual([
      "NUEVO",
      "ASIGNADO",
      "EN_PROGRESO",
      "RESUELTO",
      "CERRADO",
    ]);
    expect(saved.timeEntries).toEqual([
      expect.objectContaining({
        userId: engineer.id,
        isLate: false,
        source: "MANUAL",
      }),
    ]);
    expect(saved.slaMeasurements).toEqual([]);

    const again = await load(f.coordinator, ticket);
    expect(again).toMatchObject({ ok: true, data: { outcome: "OMITIDO" } });
    expect(await ledgerOf(db, f.bags[0].id)).toMatchObject({ balance: 480 });
  });

  it("un ticket en progreso queda abierto con su tiempo y sin descontar", async () => {
    const result = await load(
      f.coordinator,
      parse({ status: "EN_PROGRESO", workDate: "20/10/2026" }),
    );
    expect(result).toMatchObject({ ok: true, data: { chargedMinutes: 0 } });
    if (!result.ok) return;
    const saved = await db.ticket.findUniqueOrThrow({
      where: { id: result.data.ticketId },
    });
    expect(saved.status).toBe("EN_PROGRESO");
    expect(await ledgerOf(db, f.bags[0].id)).toMatchObject({ balance: 480 });
  });

  it("un solape con un registro guardado o alguien sin permiso no deja nada escrito", async () => {
    const before = await db.ticket.count();
    await addTimeEntry(db, f.ticket.id, "2026-10-21T09:00", "2026-10-21T10:00");
    const busy = await db.timeEntry.findFirstOrThrow({
      where: { ticketId: f.ticket.id },
    });
    const overlap = await load(
      f.coordinator,
      parse({ workDate: "21/10/2026", executorId: "", ownerId: busy.userId }),
    );
    expect(overlap).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    const forbidden = await load(engineer, parse({ workDate: "22/10/2026" }));
    expect(forbidden).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(await db.ticket.count()).toBe(before);
  });
});
