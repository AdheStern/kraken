// tests/integration/cv-scope.int.test.ts
// Fila "CV: ver" de AGENTS.md §2.9 contra la base: qué CV devuelve scopeCvQuery a cada rol.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

let mine: Awaited<ReturnType<typeof createCvFixture>>;
let other: Awaited<ReturnType<typeof createCvFixture>>;

beforeAll(async () => {
  mine = await createCvFixture(db);
  other = await createCvFixture(db);
  await db.cvLine.create({
    data: {
      versionId: other.version.id,
      position: 1,
      kind: "ITEM",
      areaId: other.area.id,
      description: "Firewall",
    },
  });
  const approved = await createVersion(db, other.cv.id, other.userId, 2);
  await db.cvVersion.update({
    where: { id: approved.id },
    data: { status: "APROBADA" },
  });
});

function as(id: string, ...roles: [RoleCode, string?][]): SessionUser {
  return {
    id,
    name: "Prueba",
    email: `${randomUUID()}@dima.test`,
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

async function visibleIds(user: SessionUser) {
  const ids = [mine.cv.id, other.cv.id];
  const rows = await db.cv.findMany({
    where: { AND: [scopeCvQuery(user), { id: { in: ids } }] },
    select: { id: true },
  });
  return rows.map((row) => row.id).sort();
}

describe("§2.9 CV: ver", () => {
  it("comercial: solo los propios", async () => {
    expect(await visibleIds(as(mine.userId, ["COMERCIAL"]))).toEqual([
      mine.cv.id,
    ]);
  });

  it("comercial: también donde figura como vendedor", async () => {
    await db.cvVersionSeller.create({
      data: { versionId: other.version.id, userId: mine.userId },
    });
    const ids = await visibleIds(as(mine.userId, ["COMERCIAL"]));
    expect(ids).toEqual([mine.cv.id, other.cv.id].sort());
    await db.cvVersionSeller.delete({
      where: {
        versionId_userId: { versionId: other.version.id, userId: mine.userId },
      },
    });
  });

  it("gerente de área: los que tienen una línea de su área", async () => {
    const ids = await visibleIds(
      as(randomUUID(), ["GERENTE_AREA", other.area.id]),
    );
    expect(ids).toEqual([other.cv.id]);
  });

  it("gerente general: todos", async () => {
    const ids = await visibleIds(as(randomUUID(), ["GERENTE_GENERAL"]));
    expect(ids).toEqual([mine.cv.id, other.cv.id].sort());
  });

  it("administración: solo los aprobados", async () => {
    expect(await visibleIds(as(randomUUID(), ["ADMINISTRACION"]))).toEqual([
      other.cv.id,
    ]);
  });

  it.each<[RoleCode]>([
    ["INGENIERO"],
    ["ADMIN_SISTEMA"],
    ["ALMACEN"],
  ])("%s: ninguno", async (role) => {
    expect(await visibleIds(as(mine.userId, [role]))).toEqual([]);
  });
});
