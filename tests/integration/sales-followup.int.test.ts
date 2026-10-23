// tests/integration/sales-followup.int.test.ts
// Seguimiento comercial contra la base (AGENTS.md §6): pipeline por la última versión, renovaciones en tramos
// de 30/60/90 días y tiempos de aprobación con la solicitud pendiente más antigua.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getApprovalTimes } from "@/features/dashboards/queries/get-approval-times";
import { getPipeline } from "@/features/dashboards/queries/get-pipeline";
import { getRenewals } from "@/features/dashboards/queries/get-renewals";
import type { SessionUser } from "@/server/authz/roles";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const clock = { now: () => new Date("2031-03-01T12:00:00Z") };
const noFilters = { areaId: null, cityId: null };
let seller: SessionUser;

async function line(
  versionId: string,
  areaId: string,
  sale: string,
  end?: string,
) {
  await db.cvLine.create({
    data: {
      versionId,
      position: 1,
      kind: "ITEM",
      areaId,
      description: `Soporte ${sale}`,
      quantity: "1",
      unitCostUsd: "0",
      unitSaleUsd: sale,
      coverageEnd: end ? new Date(end) : null,
    },
  });
}

async function setStatus(versionId: string, data: Record<string, unknown>) {
  await db.cvVersion.update({ where: { id: versionId }, data });
}

beforeAll(async () => {
  // CV 1: v1 observada y v2 en borrador; solo cuenta la v2.
  const first = await createCvFixture(db);
  const area = first.area.id;
  seller = {
    id: first.userId,
    name: "Comercial",
    email: "c@dima.test",
    image: null,
    roles: [{ code: "COMERCIAL", areaId: null }],
  };
  const own = async () => {
    const f = await createCvFixture(db);
    await db.cv.update({
      where: { id: f.cv.id },
      data: { createdById: seller.id },
    });
    return f;
  };
  await line(first.version.id, area, "100");
  await setStatus(first.version.id, { status: "OBSERVADA" });
  const v2 = await createVersion(db, first.cv.id, first.userId, 2);
  await line(v2.id, area, "150");

  // CV 2: en aprobación desde el 28 de febrero, con su solicitud pendiente.
  const waiting = await own();
  await line(waiting.version.id, area, "300");
  await setStatus(waiting.version.id, {
    status: "EN_APROBACION",
    submittedAt: new Date("2031-02-28T12:00:00Z"),
  });
  await db.cvApprovalRequest.create({
    data: {
      versionId: waiting.version.id,
      kind: "AREA",
      areaId: waiting.area.id,
      createdAt: new Date("2031-02-28T12:00:00Z"),
    },
  });

  // CV 3: aprobado en un día, con tres vigencias (10, 75 y 122 días).
  const renewing = await own();
  for (const [sale, end] of [
    ["40", "2031-03-11"],
    ["60", "2031-05-15"],
    ["90", "2031-07-01"],
  ]) {
    await line(renewing.version.id, area, sale, end);
  }
  await setStatus(renewing.version.id, {
    status: "APROBADA",
    submittedAt: new Date("2031-02-27T12:00:00Z"),
    approvedAt: new Date("2031-02-28T12:00:00Z"),
  });
});

describe("seguimiento comercial", () => {
  it("el pipeline cuenta solo la última versión de cada CV", async () => {
    const stages = await getPipeline(seller, noFilters);
    expect(stages.map((s) => [s.status, s.cvCount, s.saleUsd])).toEqual([
      ["BORRADOR", 1, "150.00"],
      ["EN_APROBACION", 1, "300.00"],
      ["OBSERVADA", 0, "0.00"],
    ]);
  });

  it("las renovaciones caen en tramos excluyentes dentro de 90 días", async () => {
    const view = await getRenewals(seller, noFilters, clock);
    expect(view.items.map((i) => [i.daysLeft, i.saleUsd])).toEqual([
      [10, "40.00"],
      [75, "60.00"],
    ]);
    expect(view.bands.map((b) => [b.days, b.count])).toEqual([
      [30, 1],
      [60, 0],
      [90, 1],
    ]);
  });

  it("mediana de aprobación y la solicitud pendiente más antigua", async () => {
    const febrero = {
      start: new Date("2031-02-01T04:00:00Z"),
      end: new Date("2031-03-01T04:00:00Z"),
    };
    const times = await getApprovalTimes(seller, febrero, clock);
    expect(times.approvedCount).toBe(1);
    expect(times.medianMinutes).toBe(1440);
    expect(times.oldestPending?.waitingMinutes).toBe(1440);
    expect(times.oldestPending?.requestLabel).toMatch(/^Gerente /);
  });
});
