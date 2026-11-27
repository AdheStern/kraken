// tests/integration/cv-activation.int.test.ts
// Rango de activación (AGENTS.md §2.3, decisión 2026-11-27): el trigger lo deja cambiar en cualquier estado, sin
// abrir otros campos, y applyLineActivation solo lo acepta en licencias y lo copia a la versión siguiente sin aprobar.
import { afterAll, describe, expect, it } from "vitest";
import { applyLineActivation } from "@/server/sales-control/apply-line-activation";
import { copyVersionContent } from "@/server/sales-control/copy-version-content";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

type Status = "EN_APROBACION" | "OBSERVADA" | "APROBADA" | "REEMPLAZADA";
type ItemType = "INTANGIBLE" | "HARDWARE";

const START = new Date("2026-12-01");
const END = new Date("2027-11-30");

async function cvWithLine(status: Status, itemType: ItemType = "INTANGIBLE") {
  const f = await createCvFixture(db);
  const line = await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      kind: "ITEM",
      areaId: f.area.id,
      itemType,
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

describe("trigger: rango de activación", () => {
  it.each<Status>([
    "EN_APROBACION",
    "OBSERVADA",
    "APROBADA",
    "REEMPLAZADA",
  ])("se cambia en %s, y nada más", async (status) => {
    const f = await cvWithLine(status);
    await db.cvLine.update({
      where: { id: f.line.id },
      data: { activationStart: START, activationEnd: END },
    });
    await expect(
      db.cvLine.update({
        where: { id: f.line.id },
        data: { activationStart: null, activationEnd: null, quantity: "1" },
      }),
    ).rejects.toThrow(/no admite cambios/);
  });
});

describe("applyLineActivation", () => {
  it("guarda en la versión en aprobación y copia al borrador posterior de un aprobado", async () => {
    const f = await cvWithLine("APROBADA");
    const draft = await createVersion(db, f.cv.id, f.userId, 2);
    await copyVersionContent(db, f.version.id, draft.id, { sameSale: true });

    const result = await db.$transaction((tx) =>
      applyLineActivation(tx, f.cv.id, f.version.id, [
        { id: f.line.id, activationStart: START, activationEnd: END },
      ]),
    );

    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.changes).toHaveLength(1);
    const copied = await db.cvLine.findFirstOrThrow({
      where: { versionId: draft.id },
    });
    expect(copied.activationStart).toEqual(START);
    expect(copied.activationEnd).toEqual(END);
  });

  it("sin cambios no hace nada", async () => {
    const f = await cvWithLine("EN_APROBACION");
    const result = await db.$transaction((tx) =>
      applyLineActivation(tx, f.cv.id, f.version.id, [
        { id: f.line.id, activationStart: null, activationEnd: null },
      ]),
    );
    expect(result).toEqual({ ok: true, changes: [] });
  });

  it("solo las licencias llevan activación", async () => {
    const f = await cvWithLine("EN_APROBACION", "HARDWARE");
    const result = await db.$transaction((tx) =>
      applyLineActivation(tx, f.cv.id, f.version.id, [
        { id: f.line.id, activationStart: START, activationEnd: END },
      ]),
    );
    expect(result).toMatchObject({ ok: false });
  });
});
