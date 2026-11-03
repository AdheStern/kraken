// tests/integration/cv-post-sale.int.test.ts
// Datos posventa de la versión APROBADA (AGENTS.md §2.3, decisión 2026-11-03): el trigger deja cambiar solo
// observaciones, PO#, activación, seriales y notas/PO# del leasing, y el cambio viaja al borrador abierto.
import { afterAll, describe, expect, it } from "vitest";
import { applyPostSaleLeasing } from "@/server/sales-control/apply-post-sale-leasing";
import { applyPostSaleLines } from "@/server/sales-control/apply-post-sale-lines";
import { copyVersionContent } from "@/server/sales-control/copy-version-content";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Fixture = Awaited<ReturnType<typeof createCvFixture>>;

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

function setStatus(
  versionId: string,
  status: "APROBADA" | "REEMPLAZADA" | "EN_APROBACION",
) {
  return db.cvVersion.update({ where: { id: versionId }, data: { status } });
}

async function openDraft(f: Fixture) {
  const draft = await createVersion(db, f.cv.id, f.userId, 2);
  await copyVersionContent(db, f.version.id, draft.id, { sameSale: true });
  return draft;
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

describe("applyPostSaleLines", () => {
  it("guarda en la aprobada y copia al borrador solo lo que cambió", async () => {
    const f = await approvedCv();
    const draft = await openDraft(f);
    const draftLine = await db.cvLine.findFirstOrThrow({
      where: { versionId: draft.id },
    });
    await db.cvLine.update({
      where: { id: draftLine.id },
      data: { poNumber: "PO-BORRADOR", description: "Licencia v2" },
    });

    const result = await db.$transaction((tx) =>
      applyPostSaleLines(tx, f.cv.id, f.version.id, [
        { ...details(f.line.id), poNumber: null },
      ]),
    );
    expect(result.ok && result.changes).toHaveLength(1);

    const saved = await db.cvLine.findUniqueOrThrow({
      where: { id: f.line.id },
      include: { serials: true },
    });
    expect(saved.notes).toBe("Entregado al cliente");
    expect(saved.serials.map((s) => s.serial).sort()).toEqual(["FOC1", "FOC2"]);
    const copied = await db.cvLine.findUniqueOrThrow({
      where: { id: draftLine.id },
      include: { serials: true },
    });
    expect(copied.notes).toBe("Entregado al cliente");
    expect(copied.activationStart?.toISOString()).toBe(
      "2026-11-10T00:00:00.000Z",
    );
    expect(copied.serials).toHaveLength(2);
    expect(copied.poNumber).toBe("PO-BORRADOR");
    expect(copied.description).toBe("Licencia v2");
  });

  it("rechaza activación en una línea que no es licencia", async () => {
    const f = await approvedCv("HARDWARE");
    const result = await db.$transaction((tx) =>
      applyPostSaleLines(tx, f.cv.id, f.version.id, [details(f.line.id)]),
    );
    expect(result).toEqual({
      ok: false,
      message: "Solo las licencias (tipo Intangible) llevan activación.",
    });
  });
});

describe("versión siguiente en aprobación", () => {
  it("recibe los datos posventa copiados; su contenido sigue inmutable", async () => {
    const f = await approvedCv();
    const next = await openDraft(f);
    await setStatus(next.id, "EN_APROBACION");
    const nextLine = await db.cvLine.findFirstOrThrow({
      where: { versionId: next.id },
    });

    await db.$transaction((tx) =>
      applyPostSaleLines(tx, f.cv.id, f.version.id, [details(f.line.id)]),
    );
    const copied = await db.cvLine.findUniqueOrThrow({
      where: { id: nextLine.id },
      include: { serials: true },
    });
    expect(copied.poNumber).toBe("PO-77");
    expect(copied.serials).toHaveLength(2);
    await expect(
      db.cvLine.update({
        where: { id: nextLine.id },
        data: { description: "Otra" },
      }),
    ).rejects.toThrow(/no admite cambios/);
  });

  it("sin versión aprobada, una en aprobación no admite datos posventa", async () => {
    const f = await approvedCv();
    await setStatus(f.version.id, "EN_APROBACION");
    await expect(
      db.cvLine.update({ where: { id: f.line.id }, data: { notes: "x" } }),
    ).rejects.toThrow(/no admite cambios/);
  });
});

describe("applyPostSaleLeasing", () => {
  it("guarda en la aprobada y copia al leasing equivalente del borrador", async () => {
    const f = await approvedCv();
    const draft = await openDraft(f);

    await db.$transaction((tx) =>
      applyPostSaleLeasing(tx, f.cv.id, f.version.id, [
        { id: f.leasing.id, notes: null, poNumber: "PO-L1" },
      ]),
    );
    const copied = await db.cvLeasingLine.findFirstOrThrow({
      where: { versionId: draft.id },
    });
    expect(copied.poNumber).toBe("PO-L1");
  });
});
