// tests/integration/audit.int.test.ts
// Auditoría (ADR-14): guarda antes/después con Decimal y fechas como texto, sin origen fuera de una petición,
// y el trigger impide modificar o borrar un evento.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/server/audit/record-audit";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("recordAudit", () => {
  it("guarda el evento con montos y fechas legibles, y no se puede alterar", async () => {
    const entityId = randomUUID();
    await recordAudit(db, {
      actorId: "u-1",
      entity: "cv.version",
      entityId,
      action: "ENVIAR",
      before: { totalSaleUsd: new Prisma.Decimal("62500.5") },
      after: { submittedAt: new Date("2026-10-15T12:00:00Z"), note: null },
    });
    const event = await db.auditEvent.findFirstOrThrow({ where: { entityId } });
    expect(event).toMatchObject({
      actorId: "u-1",
      action: "ENVIAR",
      ip: null,
      requestId: null,
      before: { totalSaleUsd: "62500.5" },
      after: { submittedAt: "2026-10-15T12:00:00.000Z", note: null },
    });

    await expect(
      db.auditEvent.update({ where: { id: event.id }, data: { action: "X" } }),
    ).rejects.toThrow(/inmutable/);
    await expect(
      db.auditEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow(/inmutable/);
  });
});
