// tests/integration/operations-dashboard.int.test.ts
// Tablero operativo contra la base (AGENTS.md §6, §2.9 "Tableros"): registros de HORAS-01 (§15.2) en marzo de
// 2031, SLA, resolución, tardíos, fuera de horario, utilización por alcance y horas del periodo en curso.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { currentPeriodRef } from "@/domain/dashboards/period";
import { getOperationsDashboard } from "@/features/dashboards/queries/get-operations-dashboard";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import { createTicketFixture, lp } from "./ticket-fixtures";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const MARCH = { kind: "MES" as const, year: 2031, index: 3 };
const afterMarch = { now: () => new Date("2031-04-02T12:00:00Z") };
let f: Awaited<ReturnType<typeof createTicketFixture>>;
let engineerA: Awaited<ReturnType<typeof createUserWithRoles>>;

async function engineer(name: string) {
  const user = await createUserWithRoles(db, name, [
    { code: "INGENIERO", areaId: f.area.id },
  ]);
  await db.userProfile.update({
    where: { userId: user.id },
    data: { cityId: f.city.id },
  });
  return user;
}

async function entry(
  userId: string,
  start: string,
  end: string,
  isLate = false,
) {
  await db.timeEntry.create({
    data: {
      ticketId: f.ticket.id,
      userId,
      startedAt: lp(start),
      endedAt: lp(end),
      source: "MANUAL",
      isLate,
    },
  });
}

beforeAll(async () => {
  f = await createTicketFixture(db, [{ modality: "H8X5", minutes: 780 }]);
  engineerA = await engineer("Ing A");
  const engineerB = await engineer("Ing B");
  // HORAS-01 en marzo de 2031: viernes 14 y sábado 15.
  await entry(engineerA.id, "2031-03-14T17:30", "2031-03-14T18:00");
  await entry(engineerA.id, "2031-03-14T18:15", "2031-03-14T19:30");
  await entry(engineerB.id, "2031-03-15T10:00", "2031-03-15T10:40", true);
  await db.ticket.update({
    where: { id: f.ticket.id },
    data: {
      status: "CERRADO",
      createdAt: lp("2031-03-14T08:00"),
      resolvedAt: lp("2031-03-15T12:00"),
      closedAt: lp("2031-03-16T09:00"),
    },
  });
  const policy = await db.slaPolicy.upsert({
    where: { modality_priority: { modality: "H8X5", priority: "MEDIA" } },
    create: {
      modality: "H8X5",
      priority: "MEDIA",
      firstResponseMinutes: 240,
      resolutionMinutes: 1440,
    },
    update: {},
  });
  for (const [kind, status] of [
    ["PRIMERA_RESPUESTA", "INCUMPLIDO"],
    ["RESOLUCION", "CUMPLIDO"],
  ] as const)
    await db.slaMeasurement.create({
      data: {
        ticketId: f.ticket.id,
        policyId: policy.id,
        kind,
        status,
        targetMinutes: 60,
      },
    });
  await db.$transaction((tx) =>
    postHourMovement(tx, {
      bagId: f.bags[0].id,
      kind: "CONSUMO",
      minutes: -270,
      actorId: f.userId,
      ticketId: f.ticket.id,
    }),
  );
  await db.pendingHours.create({
    data: {
      ticketId: f.ticket.id,
      customerId: f.customer.id,
      insideMinutes: 10,
      outsideMinutes: 20,
    },
  });
});

describe("tablero operativo", () => {
  it("la coordinadora ve los tickets y los ingenieros de su área", async () => {
    const board = await getOperationsDashboard(
      f.coordinator,
      { period: MARCH, areaId: null, cityId: null },
      afterMarch,
    );
    expect(board.sla).toEqual({
      firstResponse: { met: 0, missed: 1, pct: 0 },
      resolution: { met: 1, missed: 0, pct: 100 },
    });
    expect(board.medianResolutionMinutes).toBe(1680);
    expect([board.lateEntriesPct, board.outsideHoursPct]).toEqual([33.3, 69]);
    expect(board.hours.consumedRealMinutes).toBe(145);
    // Marzo de 2031 tiene 21 días hábiles de 600 min en el horario de la ciudad del ingeniero.
    expect(
      board.utilization.map((u) => [
        u.name,
        u.loggedMinutes,
        u.capacityMinutes,
        u.pct,
      ]),
    ).toEqual([
      ["Ing A", 105, 12600, 0.8],
      ["Ing B", 40, 12600, 0.3],
    ]);
  });

  it("el ingeniero solo ve su propia utilización", async () => {
    const board = await getOperationsDashboard(
      engineerA,
      { period: MARCH, areaId: null, cityId: null },
      afterMarch,
    );
    expect(board.utilization.map((u) => u.name)).toEqual(["Ing A"]);
  });

  it("en el periodo en curso: vendido, consumido ponderado, recargo y pendiente", async () => {
    const today = { now: () => new Date() };
    const board = await getOperationsDashboard(
      f.coordinator,
      { period: currentPeriodRef("MES", today), areaId: null, cityId: null },
      today,
    );
    expect(board.hours).toEqual({
      soldMinutes: 780,
      consumedWeightedMinutes: 270,
      consumedRealMinutes: 0,
      expiredMinutes: 0,
      surchargeMinutes: 270,
      termUsedMinutes: 0,
      pendingMinutes: 30,
    });
  });
});
