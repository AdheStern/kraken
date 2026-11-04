// tests/integration/access-review.int.test.ts
// Revisión de accesos (ISO 27001 A.5.18): tipo de cuenta, último inicio de sesión (auditoría o sesión, la más
// nueva), cuentas sin uso y roles asignados a mano.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getAccessReview } from "@/features/admin/queries/get-access-review";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const now = new Date("2026-11-04T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe("getAccessReview", () => {
  it("clasifica las cuentas, toma el último inicio de sesión y marca las sin uso", async () => {
    const emergency = await createUserWithRoles(db, "Emergencia", [
      { code: "ADMIN_SISTEMA" },
    ]);
    await db.account.create({
      data: {
        id: randomUUID(),
        accountId: emergency.id,
        providerId: "credential",
        userId: emergency.id,
      },
    });
    const engineer = await createUserWithRoles(db, "Ingeniero", [
      { code: "INGENIERO" },
    ]);
    await db.userProfile.update({
      where: { userId: engineer.id },
      data: { createdAt: daysAgo(200) },
    });
    await db.auditEvent.create({
      data: {
        actorId: engineer.id,
        entity: "auth.user",
        entityId: engineer.id,
        action: "INICIAR_SESION",
        createdAt: daysAgo(120),
      },
    });
    await db.session.create({
      data: {
        id: randomUUID(),
        token: randomUUID(),
        userId: emergency.id,
        expiresAt: now,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
    });

    const { accounts, manualRoles } = await getAccessReview(now, db);
    const byEmail = new Map(accounts.map((a) => [a.email, a]));
    expect(byEmail.get(emergency.email)).toMatchObject({
      kind: "Emergencia",
      lastSignInAt: daysAgo(3),
      isDormant: false,
    });
    expect(byEmail.get(engineer.email)).toMatchObject({
      kind: "Personal",
      lastSignInAt: daysAgo(120),
      isDormant: true,
    });
    expect(manualRoles.filter((r) => r.email === engineer.email)).toHaveLength(
      1,
    );
  });
});
