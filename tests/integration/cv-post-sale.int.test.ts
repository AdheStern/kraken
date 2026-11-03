// tests/integration/cv-post-sale.int.test.ts
// Datos posventa de la versión APROBADA (AGENTS.md §2.3, decisión 2026-11-03): el trigger deja cambiar solo
// observaciones, PO#, activación, seriales y notas/PO# del leasing.
import { afterAll, describe, expect, it } from "vitest";
import { createCvFixture, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

async function approvedCv(itemType: "INTANGIBLE" | "HARDWARE" = "INTANGIBLE") {
  const f = await createCvFixture(db);
  const line = await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      kind: "ITEM",
      areaId: f.area.id,
      itemType,
      description: "Licencia",
      quantity: "1",
      unitCostUsd: "100",
      factor: "2",
      unitSaleUsd: "200",
      pricingSource: "FACTOR",
    },
  });
  const leasing = await db.cvLeasingLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      description: "Leasing",
      quantity: "1",
      unitCostUsd: "10",
    },
  });
  await setStatus(f.version.id, "APROBADA");
  return { ...f, line, leasing };
}

function setStatus(versionId: string, status: "APROBADA" | "REEMPLAZADA") {
  return db.cvVersion.update({ where: { id: versionId }, data: { status } });
}

const details = (id: string) => ({
  id,
  notes: "Entregado al cliente",
  poNumber: "PO-77",
  activationStart: new Date("2026-11-10"),
  activationEnd: new Date("2026-11-20"),
  serials: ["FOC1", "FOC2"],
});

describe("trigger: versión APROBADA", () => {
  it("deja cambiar los datos posventa y nada más", async () => {
    const f = await approvedCv();
    const { serials: _s, id: _id, ...fields } = details(f.line.id);
    await db.cvLine.update({ where: { id: f.line.id }, data: fields });
    const serial = await db.cvLineSerial.create({
      data: { lineId: f.line.id, serial: "FOC1" },
    });
    await db.cvLineSerial.delete({ where: { id: serial.id } });
    await db.cvLeasingLine.update({
      where: { id: f.leasing.id },
      data: { notes: "Contrato firmado", poNumber: "PO-1" },
    });

    await expect(
      db.cvLine.update({
        where: { id: f.line.id },
        data: { notes: "x", unitSaleUsd: "300" },
      }),
    ).rejects.toThrow(/no admite cambios/);
    await expect(
      db.cvLeasingLine.update({
        where: { id: f.leasing.id },
        data: { unitCostUsd: "11" },
      }),
    ).rejects.toThrow(/no admite cambios/);
    await expect(
      db.cvLine.delete({ where: { id: f.line.id } }),
    ).rejects.toThrow(/no admite cambios/);
  });

  it("una versión REEMPLAZADA sigue inmutable", async () => {
    const f = await approvedCv();
    await setStatus(f.version.id, "REEMPLAZADA");
    await expect(
      db.cvLine.update({ where: { id: f.line.id }, data: { notes: "x" } }),
    ).rejects.toThrow(/no admite cambios/);
    await expect(
      db.cvLineSerial.create({ data: { lineId: f.line.id, serial: "S1" } }),
    ).rejects.toThrow(/no admite cambios/);
  });
});
