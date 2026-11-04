// tests/integration/security-watch.int.test.ts
// Job security.watch (ISO 27001 A.8.16): avisa al administrador del sistema de 5 intentos fallidos en 15 min y
// de cada inicio de sesión con contraseña de la cuenta de emergencia, una vez por tramo.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { watchSecurityEvents } from "@/server/security/watch-security-events";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

// POR QUÉ: una fecha lejana para no cruzarse con los eventos que otros tests guardan con la hora real.
const at = (hhmm: string) => new Date(`2031-03-03T${hhmm}:00Z`);
const clockAt = (hhmm: string) => ({ now: () => at(hhmm) });

describe("watchSecurityEvents", () => {
  it("avisa del cruce de intentos fallidos y del uso de la cuenta de emergencia, sin repetir", async () => {
    const admin = await createUserWithRoles(db, "Admin", [
      { code: "ADMIN_SISTEMA" },
    ]);
    const target = `${randomUUID()}@cliente.bo`;
    await db.auditEvent.createMany({
      data: [
        ...["09:55", "09:58", "10:00", "10:02", "10:04"].map((t) => ({
          entity: "auth.intento",
          entityId: target,
          action: "INICIO_FALLIDO",
          createdAt: at(t),
        })),
        {
          actorId: admin.id,
          entity: "auth.user",
          entityId: admin.id,
          action: "INICIAR_SESION",
          after: { method: "CONTRASENA" },
          ip: "203.0.113.7",
          createdAt: at("10:03"),
        },
        {
          actorId: admin.id,
          entity: "auth.user",
          entityId: admin.id,
          action: "INICIAR_SESION",
          after: { method: "ENTRA" },
          createdAt: at("10:04"),
        },
      ],
    });

    expect(await watchSecurityEvents(db, clockAt("10:05"))).toEqual({
      failedAccounts: 1,
      emergencySignIns: 1,
    });
    await watchSecurityEvents(db, clockAt("10:10"));

    const inbox = await db.inboxItem.findMany({
      where: { userId: admin.id },
      select: { eventType: true, title: true, body: true },
      orderBy: { eventType: "asc" },
    });
    expect(inbox).toHaveLength(2);
    expect(inbox[0]).toMatchObject({
      eventType: "SEGURIDAD_CUENTA_EMERGENCIA",
      title: `Se usó la cuenta de emergencia ${admin.email}`,
    });
    expect(inbox[0].body).toContain("203.0.113.7");
    expect(inbox[1]).toMatchObject({
      eventType: "SEGURIDAD_INTENTOS_FALLIDOS",
      title: `5 o más intentos fallidos para ${target}`,
    });
    expect(
      await db.outboxMessage.count({ where: { recipientEmail: admin.email } }),
    ).toBe(2);
  });
});
