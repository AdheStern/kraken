// tests/integration/cv-triggers.int.test.ts
// Restricciones del esquema cv en la base: versiones inmutables fuera de BORRADOR (ADR-11),
// una sola versión APROBADA por CV, CHECK de línea y unicidad de la solicitud del GG.
import { afterAll, describe, expect, it } from "vitest";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Fixture = Awaited<ReturnType<typeof createCvFixture>>;

function itemLine(f: Fixture, versionId = f.version.id) {
  return {
    versionId,
    position: 1,
    kind: "ITEM" as const,
    areaId: f.area.id,
    description: "Switch",
    quantity: "1",
    unitCostUsd: "100",
    factor: "2",
    unitSaleUsd: "200",
    pricingSource: "FACTOR" as const,
  };
}

async function submit(versionId: string) {
  await db.cvVersion.update({
    where: { id: versionId },
    data: { status: "EN_APROBACION", submittedAt: new Date() },
  });
}

describe("versión fuera de BORRADOR", () => {
  it("bloquea crear, editar y borrar líneas, grupos, leasing y vendedores", async () => {
    const f = await createCvFixture(db);
    const line = await db.cvLine.create({ data: itemLine(f) });
    await submit(f.version.id);

    await expect(db.cvLine.create({ data: itemLine(f) })).rejects.toThrow(
      /no admite cambios/,
    );
    await expect(
      db.cvLine.update({
        where: { id: line.id },
        data: { description: "Otro" },
      }),
    ).rejects.toThrow(/no admite cambios/);
    await expect(db.cvLine.delete({ where: { id: line.id } })).rejects.toThrow(
      /no admite cambios/,
    );
    await expect(
      db.cvGroup.create({
        data: { versionId: f.version.id, name: "LOTE 1", position: 1 },
      }),
    ).rejects.toThrow(/no admite cambios/);
    await expect(
      db.cvLeasingLine.create({
        data: {
          versionId: f.version.id,
          position: 1,
          description: "Leasing",
          quantity: "1",
          unitCostUsd: "10",
        },
      }),
    ).rejects.toThrow(/no admite cambios/);
    await expect(
      db.cvVersionSeller.create({
        data: { versionId: f.version.id, userId: f.userId },
      }),
    ).rejects.toThrow(/no admite cambios/);
    await expect(
      db.cvLineSerial.create({ data: { lineId: line.id, serial: "FOC123" } }),
    ).rejects.toThrow(/no admite cambios/);
  });

  it("solo deja cambiar el estado y sus marcas de tiempo", async () => {
    const f = await createCvFixture(db);
    await submit(f.version.id);

    await expect(
      db.cvVersion.update({
        where: { id: f.version.id },
        data: { title: "Cambiado" },
      }),
    ).rejects.toThrow(/es inmutable/);
    await expect(
      db.cvVersion.update({
        where: { id: f.version.id },
        data: { saleFxRate: "7.00" },
      }),
    ).rejects.toThrow(/es inmutable/);
    await expect(
      db.cvVersion.delete({ where: { id: f.version.id } }),
    ).rejects.toThrow(/es inmutable/);

    const approved = await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "APROBADA", approvedAt: new Date() },
    });
    expect(approved.status).toBe("APROBADA");
  });

  it("en BORRADOR todo es editable", async () => {
    const f = await createCvFixture(db);
    const line = await db.cvLine.create({ data: itemLine(f) });
    await db.cvLine.update({
      where: { id: line.id },
      data: { description: "Router" },
    });
    const version = await db.cvVersion.update({
      where: { id: f.version.id },
      data: { title: "Nuevo título" },
    });
    expect(version.title).toBe("Nuevo título");
  });
});

describe("restricciones de datos", () => {
  it("no permite dos versiones APROBADA del mismo CV", async () => {
    const f = await createCvFixture(db);
    const v2 = await createVersion(db, f.cv.id, f.userId, 2);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "APROBADA" },
    });
    await expect(
      db.cvVersion.update({
        where: { id: v2.id },
        data: { status: "APROBADA" },
      }),
    ).rejects.toThrow();
  });

  it("una línea ITEM exige área", async () => {
    const f = await createCvFixture(db);
    await expect(
      db.cvLine.create({ data: { ...itemLine(f), areaId: null } }),
    ).rejects.toThrow(/linea_area_obligatoria_ck/);
  });

  it("una línea con costo 0 no lleva factor", async () => {
    const f = await createCvFixture(db);
    await expect(
      db.cvLine.create({ data: { ...itemLine(f), unitCostUsd: "0" } }),
    ).rejects.toThrow(/linea_factor_sin_costo_ck/);
  });

  it("solo una solicitud del GG por versión (area_id nulo)", async () => {
    const f = await createCvFixture(db);
    const request = {
      versionId: f.version.id,
      kind: "GERENCIA_GENERAL" as const,
    };
    await db.cvApprovalRequest.create({ data: request });
    await expect(
      db.cvApprovalRequest.create({ data: request }),
    ).rejects.toThrow();
  });
});
