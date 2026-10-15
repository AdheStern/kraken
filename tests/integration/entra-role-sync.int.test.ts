// tests/integration/entra-role-sync.int.test.ts
// Grupos de Entra → roles al iniciar sesión (AGENTS.md ADR-05): da los de sus grupos, quita los de Entra que ya
// no le tocan, no toca los manuales y con overage conserva lo que tenía.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { syncEntraRoles } from "@/server/entra/sync-entra-roles";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const token = (claims: object) =>
  `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`;

async function fixture() {
  const area = await db.area.create({
    data: { code: `A${randomUUID().slice(0, 6).toUpperCase()}`, name: "Área" },
  });
  const user = await createUserWithRoles(db, "Persona", [
    { code: "COMERCIAL" },
  ]);
  const [manager, engineer] = await Promise.all(
    (["GERENTE_AREA", "INGENIERO"] as const).map((code) =>
      db.role.upsert({
        where: { code },
        create: { code, name: code },
        update: {},
      }),
    ),
  );
  const managers = randomUUID();
  const engineers = randomUUID();
  await db.entraGroupRole.createMany({
    data: [
      { entraGroupId: managers, roleId: manager.id, areaId: area.id },
      { entraGroupId: engineers, roleId: engineer.id, areaId: area.id },
    ],
  });
  return { area, user, managers, engineers };
}

const rolesOf = (userId: string) =>
  db.userRole.findMany({
    where: { userId },
    select: { source: true, role: { select: { code: true } } },
    orderBy: { createdAt: "asc" },
  });

describe("syncEntraRoles", () => {
  it("da los roles de sus grupos y los quita cuando sale del grupo; los manuales quedan", async () => {
    const f = await fixture();
    await syncEntraRoles(
      f.user.id,
      token({ groups: [f.managers, f.engineers] }),
      db,
    );
    expect(
      (await rolesOf(f.user.id)).map((r) => `${r.role.code}:${r.source}`),
    ).toEqual(
      expect.arrayContaining([
        "COMERCIAL:MANUAL",
        "GERENTE_AREA:ENTRA",
        "INGENIERO:ENTRA",
      ]),
    );

    await syncEntraRoles(
      f.user.id,
      token({ groups: [f.engineers.toUpperCase()] }),
      db,
    );
    expect((await rolesOf(f.user.id)).map((r) => r.role.code).sort()).toEqual([
      "COMERCIAL",
      "INGENIERO",
    ]);

    await syncEntraRoles(f.user.id, token({ name: "sin grupos" }), db);
    const trail = await db.auditEvent.count({
      where: {
        entityId: f.user.id,
        action: "SINCRONIZAR_ENTRA",
        actorId: null,
      },
    });
    expect(trail).toBe(3);
    expect((await rolesOf(f.user.id)).map((r) => r.role.code)).toEqual([
      "COMERCIAL",
    ]);
  });

  it("con overage conserva los roles de Entra que tenía", async () => {
    const f = await fixture();
    await syncEntraRoles(f.user.id, token({ groups: [f.managers] }), db);
    const result = await syncEntraRoles(
      f.user.id,
      token({ _claim_names: { groups: "src1" } }),
      db,
    );
    expect(result).toBe("overage");
    expect((await rolesOf(f.user.id)).map((r) => r.role.code).sort()).toEqual([
      "COMERCIAL",
      "GERENTE_AREA",
    ]);
  });
});
