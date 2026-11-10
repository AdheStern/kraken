// tests/integration/cv-list.int.test.ts
// Listado de CV: muestra las áreas de las líneas de la versión más reciente, sin repetir, y la foto y el nombre
// de sus vendedores (AGENTS.md §2.1).
import { afterAll, describe, expect, it, vi } from "vitest";
import { listCvs } from "@/features/sales-control/queries/list-cvs";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("listCvs", () => {
  it("trae las áreas sin repetir y los vendedores de la última versión", async () => {
    const f = await createCvFixture(db);
    const other = await db.area.create({
      data: { code: `ZZ-${f.area.code}`, name: "Otra" },
    });
    const seller = await createUserWithRoles(db, "Ana Comercial", [
      { code: "COMERCIAL" },
    ]);
    await db.user.update({
      where: { id: seller.id },
      data: { image: "data:image/jpeg;base64,AAAA" },
    });
    await db.cvVersionSeller.create({
      data: { versionId: f.version.id, userId: seller.id },
    });
    for (const [position, areaId] of [f.area.id, f.area.id, other.id].entries())
      await db.cvLine.create({
        data: {
          versionId: f.version.id,
          position: position + 1,
          kind: "ITEM",
          areaId,
          description: `Línea ${position + 1}`,
        },
      });
    const viewer = await createUserWithRoles(db, "Gerencia", [
      { code: "GERENTE_GENERAL" },
    ]);

    const rows = await listCvs(viewer, { search: f.cv.code });
    const row = rows.find((r) => r.id === f.cv.id);
    expect(row?.areas).toEqual([f.area.code, other.code].sort());
    expect(row?.sellers).toEqual([
      {
        id: seller.id,
        name: "Ana Comercial",
        image: "data:image/jpeg;base64,AAAA",
      },
    ]);
  });
});
