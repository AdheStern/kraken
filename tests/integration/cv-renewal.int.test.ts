// tests/integration/cv-renewal.int.test.ts
// CV de renovación (AGENTS.md §2.1 "Vigencia", decisión 2026-11-05): número nuevo, solo las líneas elegidas con
// su periodo siguiente, sin PO ni activación del periodo anterior, sin leasing y con los totales recalculados.
import { afterAll, describe, expect, it } from "vitest";
import { createCvCopy } from "@/server/sales-control/duplicate-cv-core";
import { createCvFixture, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const NOW = new Date("2026-11-05T15:00:00Z");

describe("createCvCopy RENOVAR", () => {
  it("copia la línea elegida con la vigencia siguiente y recalcula los totales", async () => {
    const f = await createCvFixture(db);
    const line = (position: number, description: string, sale: string) => ({
      versionId: f.version.id,
      position,
      kind: "ITEM" as const,
      areaId: f.area.id,
      description,
      quantity: "2",
      unitCostUsd: "100.00",
      unitSaleUsd: sale,
      pricingSource: "PRECIO" as const,
      coverageStart: new Date("2025-12-01"),
      coverageEnd: new Date("2026-11-30"),
      poNumber: "PO-1",
      activationStart: new Date("2025-12-01"),
    });
    const kept = await db.cvLine.create({
      data: line(1, "Soporte FortiGate", "150.00"),
    });
    await db.cvLine.create({ data: line(2, "Instalación", "500.00") });
    await db.cvLeasingLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        description: "Leasing",
        quantity: "1",
        unitCostUsd: "10",
      },
    });
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "APROBADA" },
    });
    // TRAMPA: el fixture fija el número 1 sin pasar por el numerador, que también daría el 1.
    const source = await db.cv.update({
      where: { id: f.cv.id },
      data: { code: `FIX-${f.cv.id}`, number: 999 },
      include: { city: true },
    });
    const version = await db.cvVersion.findUniqueOrThrow({
      where: { id: f.version.id },
      include: { sellers: true },
    });

    const copy = await db.$transaction((tx) =>
      createCvCopy(
        tx,
        f.userId,
        source,
        version,
        { kind: "RENOVAR", lineIds: [kept.id] },
        NOW,
      ),
    );

    const created = await db.cvVersion.findFirstOrThrow({
      where: { cvId: copy.id },
      include: { lines: true, leasingLines: true },
    });
    expect(copy.code).not.toBe(source.code);
    expect(created).toMatchObject({
      status: "BORRADOR",
      title: "Renovación: Prueba",
    });
    expect(created.totalSaleUsd.toFixed(2)).toBe("300.00");
    expect(created.totalCostUsd.toFixed(2)).toBe("200.00");
    expect(created.leasingLines).toHaveLength(0);
    expect(created.lines).toHaveLength(1);
    expect(created.lines[0]).toMatchObject({
      description: "Soporte FortiGate",
      position: 1,
      poNumber: null,
      activationStart: null,
      originLineId: null,
      coverageStart: new Date("2026-12-01"),
      coverageEnd: new Date("2027-11-30"),
    });
  });
});
