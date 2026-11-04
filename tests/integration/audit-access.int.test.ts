// tests/integration/audit-access.int.test.ts
// Rastro de accesos (ADR-14; ISO 27001 A.8.15): inicio de sesión por método, intento fallido por correo
// normalizado y descarga con su detalle.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { auditFailedSignIn, auditSignIn } from "@/server/audit/audit-sign-in";
import { recordAccess } from "@/server/audit/record-access";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("rastro de accesos", () => {
  it("registra el inicio de sesión con su método", async () => {
    const userId = randomUUID();
    await auditSignIn({ id: "s-1", userId }, { path: "/sign-in/email" }, db);
    await auditSignIn({ id: "s-2", userId }, { path: "/callback/:id" }, db);
    const events = await db.auditEvent.findMany({
      where: { entity: "auth.user", entityId: userId },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => [e.actorId, e.action, e.after])).toEqual([
      [userId, "INICIAR_SESION", { method: "CONTRASENA", sessionId: "s-1" }],
      [userId, "INICIAR_SESION", { method: "ENTRA", sessionId: "s-2" }],
    ]);
  });

  it("registra el intento fallido sin actor, con el correo normalizado y recortado", async () => {
    const local = randomUUID();
    await auditFailedSignIn(
      `  ${local.toUpperCase()}@Cliente.BO `,
      "INVALID_EMAIL_OR_PASSWORD",
      db,
    );
    await auditFailedSignIn(
      `${"x".repeat(300)}${local}`,
      "SIN_ACCESO_CON_CONTRASENA",
      db,
    );
    const exact = await db.auditEvent.findFirstOrThrow({
      where: { entity: "auth.intento", entityId: `${local}@cliente.bo` },
    });
    expect(exact).toMatchObject({
      actorId: null,
      action: "INICIO_FALLIDO",
      after: { reason: "INVALID_EMAIL_OR_PASSWORD" },
    });
    const long = await db.auditEvent.findFirstOrThrow({
      where: {
        entity: "auth.intento",
        after: { equals: { reason: "SIN_ACCESO_CON_CONTRASENA" } },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(long.entityId).toHaveLength(254);
  });

  it("registra una exportación con sus filtros", async () => {
    const actorId = randomUUID();
    await recordAccess(
      {
        actorId,
        entity: "dash.tablero",
        entityId: "ventas",
        action: "EXPORTAR",
        detail: { periodo: "2026-10" },
      },
      db,
    );
    const event = await db.auditEvent.findFirstOrThrow({ where: { actorId } });
    expect(event).toMatchObject({
      entity: "dash.tablero",
      entityId: "ventas",
      action: "EXPORTAR",
      after: { periodo: "2026-10" },
    });
  });
});
