// tests/integration/cv-lines-persistence.int.test.ts
// Guardado de líneas de una versión: sincronización, posiciones, lotes, totales, versión cerrada y copia.
import { afterAll, describe, expect, it } from "vitest";
import { copyVersionContent } from "@/server/sales-control/copy-version-content";
import {
  replaceVersionLines,
  type VersionLineRecord,
} from "@/server/sales-control/replace-version-lines";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

function item(
  areaId: string,
  description: string,
  groupKey: string | null = null,
  id: string | null = null,
): VersionLineRecord {
  return {
    id,
    groupKey,
    serials: [],
    createProduct: false,
    data: {
      kind: "ITEM",
      description,
      areaId,
      supplierId: null,
      supplyMode: null,
      technologyId: null,
      itemType: null,
      productId: null,
      code: null,
      unitId: null,
      quantity: "1.00",
      unitCostUsd: "100.00",
      factor: "2.00",
      unitSaleUsd: "200.00",
      pricingSource: "FACTOR",
      poNumber: null,
      notes: null,
      coverageStart: null,
      coverageEnd: null,
      hourBagSpec: null,
    },
  };
}

const TOTALS = { totalCostUsd: "200.00", totalSaleUsd: "400.00" };

describe("replaceVersionLines", () => {
  it("crea lotes y líneas en orden, borra las que ya no vienen y guarda totales", async () => {
    const f = await createCvFixture(db);
    const groups = [{ key: "g1", id: null, name: "LOTE 1" }];
    await db.$transaction((tx) =>
      replaceVersionLines(
        tx,
        f.version.id,
        groups,
        [item(f.area.id, "A"), item(f.area.id, "B", "g1")],
        TOTALS,
      ),
    );
    const saved = await db.cvLine.findMany({
      where: { versionId: f.version.id },
      orderBy: { position: "asc" },
    });
    expect(
      saved.map((l) => [l.position, l.description, l.groupId !== null]),
    ).toEqual([
      [1, "A", false],
      [2, "B", true],
    ]);
    const version = await db.cvVersion.findUniqueOrThrow({
      where: { id: f.version.id },
    });
    expect(version.totalSaleUsd.toFixed(2)).toBe("400.00");

    await db.$transaction((tx) =>
      replaceVersionLines(
        tx,
        f.version.id,
        [],
        [item(f.area.id, "B editada", null, saved[1].id)],
        { totalCostUsd: "100.00", totalSaleUsd: "200.00" },
      ),
    );
    const after = await db.cvLine.findMany({
      where: { versionId: f.version.id },
    });
    expect(after.map((l) => [l.id, l.description, l.groupId])).toEqual([
      [saved[1].id, "B editada", null],
    ]);
    expect(await db.cvGroup.count({ where: { versionId: f.version.id } })).toBe(
      0,
    );
  });

  it("no puede modificar una versión que ya no está en borrador", async () => {
    const f = await createCvFixture(db);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "EN_APROBACION" },
    });
    await expect(
      db.$transaction((tx) =>
        replaceVersionLines(
          tx,
          f.version.id,
          [],
          [item(f.area.id, "X")],
          TOTALS,
        ),
      ),
    ).rejects.toThrow(/no admite cambios/);
  });
});

describe("copyVersionContent", () => {
  it("copia lotes, líneas y leasing con los lotes reasignados", async () => {
    const f = await createCvFixture(db);
    await db.$transaction((tx) =>
      replaceVersionLines(
        tx,
        f.version.id,
        [{ key: "g1", id: null, name: "LOTE 1" }],
        [item(f.area.id, "A", "g1")],
        TOTALS,
      ),
    );
    await db.cvLeasingLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        description: "UPS",
        quantity: "1",
        unitCostUsd: "250",
      },
    });
    const target = await createVersion(db, f.cv.id, f.userId, 2);
    await db.$transaction((tx) =>
      copyVersionContent(tx, f.version.id, target.id, { includeSerials: true }),
    );

    const [line] = await db.cvLine.findMany({
      where: { versionId: target.id },
      include: { group: true },
    });
    expect(line.description).toBe("A");
    expect(line.group?.versionId).toBe(target.id);
    expect(
      await db.cvLeasingLine.count({ where: { versionId: target.id } }),
    ).toBe(1);
  });
});
