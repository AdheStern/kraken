// tests/integration/cv-list.int.test.ts
// Listado de CV: muestra las áreas de las líneas de la versión más reciente, sin repetir, y la foto y el nombre
// de sus vendedores, y el costo total solo a quien ve costos de ese CV (AGENTS.md §2.1, §2.9 y regla 12); la
// página ordena todo el alcance antes de cortar y filtra por área sin salir del alcance (regla 7).
import { afterAll, describe, expect, it, vi } from "vitest";
import { listCvPage } from "@/features/sales-control/queries/list-cv-page";
import { listCvs } from "@/features/sales-control/queries/list-cvs";
import { parseCvListParams } from "@/features/sales-control/schemas/cv-list-params";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
  createVersion,
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

  it("el costo total sale solo para quien ve costos del CV", async () => {
    const f = await createCvFixture(db);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { totalCostUsd: "382.81", totalSaleUsd: "1116.56" },
    });
    const seller = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    await db.cvVersionSeller.create({
      data: { versionId: f.version.id, userId: seller.id },
    });
    const presales = await createUserWithRoles(db, "Preventa", [
      { code: "PREVENTA" },
    ]);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { presalesId: presales.id },
    });
    const general = await createUserWithRoles(db, "Gerencia", [
      { code: "GERENTE_GENERAL" },
    ]);
    const costFor = async (user: typeof seller) =>
      (await listCvs(user, { search: f.cv.code })).find((r) => r.id === f.cv.id)
        ?.totalCostUsd;

    expect(await costFor(general)).toBe("382.81");
    expect(await costFor(seller)).toBe("382.81");
    // REGLA: la preventa del CV ve costo y venta (decisión 2026-11-27).
    expect(await costFor(presales)).toBe("382.81");
  });
});

describe("listCvPage", () => {
  async function threeCvs() {
    const f = await createCvFixture(db);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { totalSaleUsd: "985.76" },
    });
    const ids = [f.cv.id];
    for (const [number, sale] of [
      [2, "10000.00"],
      [3, "130.80"],
    ] as const) {
      const cv = await db.cv.create({
        data: {
          number,
          cityId: f.city.id,
          year: 2026,
          code: `00${number}${f.city.code}-26`,
          customerId: f.customer.id,
          createdById: f.userId,
        },
      });
      const version = await createVersion(db, cv.id, f.userId, 1);
      await db.cvVersion.update({
        where: { id: version.id },
        data: { totalSaleUsd: sale },
      });
      ids.push(cv.id);
    }
    return { f, ids };
  }

  it("ordena por venta todo el alcance y corta la página pedida", async () => {
    const { f, ids } = await threeCvs();
    const viewer = await createUserWithRoles(db, "Gerencia", [
      { code: "GERENTE_GENERAL" },
    ]);
    const params = parseCvListParams({
      q: f.customer.name,
      orden: "venta",
      dir: "desc",
      filas: "10",
    });

    const first = await listCvPage(viewer, params);
    expect(first.rows.map((r) => r.id)).toEqual([ids[1], ids[0], ids[2]]);
    expect(first).toMatchObject({ total: 3, page: 1, pageCount: 1 });

    const beyond = await listCvPage(viewer, {
      ...params,
      page: 9,
      pageSize: 2,
    } as const);
    expect(beyond).toMatchObject({ page: 2, pageCount: 2, firstIndex: 3 });
    expect(beyond.rows.map((r) => r.id)).toEqual([ids[2]]);
  });

  it("filtra por área y no muestra CV fuera del alcance", async () => {
    const { f, ids } = await threeCvs();
    await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        kind: "ITEM",
        areaId: f.area.id,
        description: "Línea",
      },
    });
    const general = await createUserWithRoles(db, "Gerencia", [
      { code: "GERENTE_GENERAL" },
    ]);
    const outsider = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    const params = parseCvListParams({ q: f.customer.name, area: f.area.id });

    const page = await listCvPage(general, params);
    expect(page.rows.map((r) => r.id)).toEqual([ids[0]]);
    expect((await listCvPage(outsider, params)).total).toBe(0);
  });

  it("estado y área se filtran por la última versión", async () => {
    const f = await createCvFixture(db);
    await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        kind: "ITEM",
        areaId: f.area.id,
        description: "Solo en la v1",
      },
    });
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "REEMPLAZADA" },
    });
    const v2 = await createVersion(db, f.cv.id, f.userId, 2);
    await db.cvVersion.update({
      where: { id: v2.id },
      data: { status: "APROBADA" },
    });
    const general = await createUserWithRoles(db, "Gerencia", [
      { code: "GERENTE_GENERAL" },
    ]);
    const ids = async (raw: Record<string, string>) =>
      (
        await listCvPage(general, parseCvListParams({ q: f.cv.code, ...raw }))
      ).rows.map((r) => r.id);

    expect(await ids({ estado: "APROBADA" })).toEqual([f.cv.id]);
    expect(await ids({ estado: "REEMPLAZADA" })).toEqual([]);
    expect(await ids({ area: f.area.id })).toEqual([]);
    expect(
      (await listCvs(general, { search: f.cv.code, status: "REEMPLAZADA" }))
        .length,
    ).toBe(0);
  });
});
