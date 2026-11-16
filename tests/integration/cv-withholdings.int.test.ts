// tests/integration/cv-withholdings.int.test.ts
// GROSS UP y RET DIMA (AGENTS.md §2.3, decisión 2026-11-16): el trigger los deja cambiar en cualquier estado, sin
// abrir otros campos, y applyLineWithholdings copia lo que cambió a la versión siguiente sin aprobar.
import { afterAll, describe, expect, it } from "vitest";
import { applyLineWithholdings } from "@/server/sales-control/apply-line-withholdings";
import { copyVersionContent } from "@/server/sales-control/copy-version-content";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Status = "EN_APROBACION" | "APROBADA" | "REEMPLAZADA" | "ANULADA";

async function cvWithLine(status: Status) {
  const f = await createCvFixture(db);
  const line = await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      kind: "ITEM",
      areaId: f.area.id,
      itemType: "INTANGIBLE",
      description: "Office 365 A3",
      quantity: "17",
      unitCostUsd: "32.33",
      factor: "2.03",
      unitSaleUsd: "65.63",
      pricingSource: "FACTOR",
    },
  });
  await db.cvVersion.update({
    where: { id: f.version.id },
    data: { status },
  });
  return { ...f, line };
}

describe("trigger: GROSS UP y RET DIMA", () => {
  it.each<Status>([
    "EN_APROBACION",
    "APROBADA",
    "REEMPLAZADA",
    "ANULADA",
  ])("se cambian en %s, y nada más", async (status) => {
    const f = await cvWithLine(status);
    await db.cvLine.update({
      where: { id: f.line.id },
      data: { grossUpUsd: "74.15", retDimaUsd: "593.18" },
    });
    await expect(
      db.cvLine.update({
        where: { id: f.line.id },
        data: { grossUpUsd: "1", unitCostUsd: "1" },
      }),
    ).rejects.toThrow(/no admite cambios/);
  });

  it("no admite montos negativos", async () => {
    const f = await cvWithLine("APROBADA");
    await expect(
      db.cvLine.update({
        where: { id: f.line.id },
        data: { retDimaUsd: "-1" },
      }),
    ).rejects.toThrow(/linea_gross_up_ret_dima_ck/);
  });
});

describe("applyLineWithholdings", () => {
  it("guarda en la versión y copia al borrador solo lo que cambió", async () => {
    const f = await cvWithLine("APROBADA");
    const draft = await createVersion(db, f.cv.id, f.userId, 2);
    await copyVersionContent(db, f.version.id, draft.id, { sameSale: true });
    const draftLine = await db.cvLine.findFirstOrThrow({
      where: { versionId: draft.id },
    });
    await db.cvLine.update({
      where: { id: draftLine.id },
      data: { retDimaUsd: "10.00" },
    });

    const result = await db.$transaction((tx) =>
      applyLineWithholdings(tx, f.cv.id, f.version.id, [
        { id: f.line.id, grossUpUsd: "74.15", retDimaUsd: null },
      ]),
    );

    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.changes).toEqual([
      {
        before: { id: f.line.id, grossUpUsd: null, retDimaUsd: null },
        after: { id: f.line.id, grossUpUsd: "74.15", retDimaUsd: null },
      },
    ]);
    const saved = await db.cvLine.findUniqueOrThrow({
      where: { id: f.line.id },
    });
    expect(saved.grossUpUsd?.toFixed(2)).toBe("74.15");
    const copied = await db.cvLine.findUniqueOrThrow({
      where: { id: draftLine.id },
    });
    expect(copied.grossUpUsd?.toFixed(2)).toBe("74.15");
    expect(copied.retDimaUsd?.toFixed(2)).toBe("10.00");
  });

  it("el mismo monto escrito distinto no es un cambio", async () => {
    const f = await cvWithLine("EN_APROBACION");
    await db.cvLine.update({
      where: { id: f.line.id },
      data: { grossUpUsd: "10" },
    });
    const result = await db.$transaction((tx) =>
      applyLineWithholdings(tx, f.cv.id, f.version.id, [
        { id: f.line.id, grossUpUsd: "10.00", retDimaUsd: null },
      ]),
    );
    expect(result).toEqual({ ok: true, changes: [] });
  });
});
