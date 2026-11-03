// tests/integration/engineers-dashboard.int.test.ts
// Desempeño por ingeniero contra la base (AGENTS.md §6): cada rol ve su alcance (scopeEngineerQuery), el ingeniero
// solo a sí mismo, y las cifras salen de sus registros y de los tickets a su cargo. Periodo en 2031 para aislarlo.
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  getEngineerDetail,
  getEngineersDashboard,
} from "@/features/dashboards/queries/get-engineers-dashboard";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import { createTicket, createTicketFixture, lp } from "./ticket-fixtures";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const PERIOD = { kind: "MES" as const, year: 2031, index: 3 };
const clock = { now: () => lp("2031-04-15T12:00") };

async function setup() {
  const f = await createTicketFixture(db, []);
  const engineer = await createUserWithRoles(db, "Ana Ingeniera", [
    { code: "INGENIERO", areaId: f.area.id },
  ]);
  const other = await createUserWithRoles(db, "Bruno Ingeniero", [
    { code: "INGENIERO", areaId: f.area.id },
  ]);
  await db.userProfile.updateMany({
    where: { userId: { in: [engineer.id, other.id] } },
    data: { cityId: f.city.id },
  });
  const manager = await createUserWithRoles(db, "Gerente", [
    { code: "GERENTE_AREA", areaId: f.area.id },
  ]);
  // Lunes 3/3/2031: ticket a cargo de Ana, resuelto y cerrado en el mes, con 2 h descontadas.
  const owned = await createTicket(db, f, [], "CERRADO");
  await db.ticket.update({
    where: { id: owned.id },
    data: {
      ownerId: engineer.id,
      createdAt: lp("2031-03-03T09:00"),
      resolvedAt: lp("2031-03-03T11:00"),
      closedAt: lp("2031-03-04T09:00"),
    },
  });
  await db.timeEntry.create({
    data: {
      ticketId: owned.id,
      userId: engineer.id,
      startedAt: lp("2031-03-03T17:30"),
      endedAt: lp("2031-03-03T19:30"),
      source: "CONTADOR",
    },
  });
  return { f, engineer, other, manager, owned };
}

describe("tablero de ingenieros", () => {
  it("el gerente ve a los ingenieros de su área con sus cifras", async () => {
    const { engineer, other, manager } = await setup();
    const { rows } = await getEngineersDashboard(
      manager,
      { period: PERIOD, areaId: null },
      clock,
    );
    expect(rows.map((r) => r.name)).toEqual([
      "Ana Ingeniera",
      "Bruno Ingeniero",
    ]);
    const ana = rows.find((r) => r.userId === engineer.id);
    expect(ana).toMatchObject({
      loggedMinutes: 120,
      outsidePct: 50,
      ownedResolved: 1,
      participated: 1,
      medianResolutionMinutes: 120,
    });
    expect(rows.find((r) => r.userId === other.id)?.loggedMinutes).toBe(0);
  });

  it("el ingeniero ve solo su detalle, con su ticket y su serie semanal", async () => {
    const { engineer, other, owned } = await setup();
    const own = await getEngineerDetail(
      engineer,
      engineer.id,
      { period: PERIOD, areaId: null },
      clock,
    );
    expect(own?.tickets.map((t) => [t.id, t.role, t.myMinutes])).toEqual([
      [owned.id, "ENCARGADO", 120],
    ]);
    // POR QUÉ: marzo de 2031 empieza en sábado; la primera semana es la del lunes 24 de febrero, en 0.
    expect(own?.weeks.slice(0, 2)).toEqual([
      { weekStart: "2031-02-24", minutes: 0 },
      { weekStart: "2031-03-03", minutes: 120 },
    ]);
    expect(
      await getEngineerDetail(
        engineer,
        other.id,
        { period: PERIOD, areaId: null },
        clock,
      ),
    ).toBeNull();
  });
});
