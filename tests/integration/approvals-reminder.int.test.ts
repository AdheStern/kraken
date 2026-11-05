// tests/integration/approvals-reminder.int.test.ts
// Job approvals.reminder con reloj fijo (AGENTS.md §2.3 y §7): un aviso por aprobador con sus pendientes de más
// de 24 h, sin repetir el mismo día y sin correr en feriado nacional.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { remindApprovals } from "@/server/sales-control/remind-approvals";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
// Lunes 09:00 en La Paz.
const NOW = new Date("2026-11-09T13:00:00Z");
const clock = { now: () => NOW };

let area: { id: string };
let manager: SessionUser;

beforeAll(async () => {
  area = await db.area.create({
    data: { code: `REM-${randomUUID().slice(0, 4)}`, name: "Área recordada" },
  });
  manager = await createUserWithRoles(db, "Gerente", [
    { code: "GERENTE_AREA", areaId: area.id },
  ]);
});

async function pendingRequest(createdAt: Date) {
  const f = await createCvFixture(db);
  return db.cvApprovalRequest.create({
    data: { versionId: f.version.id, kind: "AREA", areaId: area.id, createdAt },
  });
}

const reminders = () =>
  db.inboxItem.findMany({
    where: { userId: manager.id, eventType: "CV_RECORDATORIO" },
  });

describe("remindApprovals", () => {
  it("avisa una vez al gerente por sus pendientes viejos y no repite el mismo día", async () => {
    const old = await pendingRequest(new Date("2026-11-06T13:00:00Z"));
    await pendingRequest(new Date("2026-11-07T13:00:00Z"));
    const fresh = await pendingRequest(new Date("2026-11-09T12:00:00Z"));
    await remindApprovals(db, clock);
    const [notice, ...rest] = await reminders();
    expect(rest).toHaveLength(0);
    expect(notice.title).toBe("2 CV siguen esperando tu aprobación");
    expect(notice.body).toContain("hace 3 días");
    const after = await db.cvApprovalRequest.findMany({
      where: { id: { in: [old.id, fresh.id] } },
    });
    expect(after.find((r) => r.id === old.id)?.remindedAt).toEqual(NOW);
    expect(after.find((r) => r.id === fresh.id)?.remindedAt).toBeNull();

    await remindApprovals(db, { now: () => new Date(NOW.getTime() + 60_000) });
    expect(await reminders()).toHaveLength(1);
  });

  it("no recuerda en un feriado nacional", async () => {
    const holiday = new Date("2030-06-17T13:00:00Z");
    const date = new Date("2030-06-17");
    // POR QUÉ: la base de pruebas es compartida; otro test pudo cargar ya ese feriado.
    if (!(await db.holiday.findFirst({ where: { date, cityId: null } })))
      await db.holiday.create({ data: { date, name: "Feriado de prueba" } });
    const result = await remindApprovals(db, { now: () => holiday });
    expect(result).toMatchObject({ skipped: "FERIADO" });
  });
});
