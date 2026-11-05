// tests/integration/renewal-notices.int.test.ts
// Job renewals.notify con reloj fijo (AGENTS.md §2.1 "Vigencia", decisión 2026-11-05): avisa a los vendedores y al
// gerente del área a los 60 y a los 15 días, una vez por linaje y umbral, y nunca por un CV de saldo inicial.
import { afterAll, describe, expect, it } from "vitest";
import { notifyRenewals } from "@/server/sales-control/notify-renewals";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
// Jueves 05/11/2026, 07:00 en La Paz.
const TODAY = new Date("2026-11-05T11:00:00Z");
const at = (date: Date) => ({ now: () => date });

async function approvedLine(coverageEnd: string, isOpeningBalance = false) {
  const f = await createCvFixture(db);
  const manager = await createUserWithRoles(db, "Gerente", [
    { code: "GERENTE_AREA", areaId: f.area.id },
  ]);
  await db.cvVersionSeller.create({
    data: { versionId: f.version.id, userId: f.userId },
  });
  const line = await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position: 1,
      kind: "ITEM",
      areaId: f.area.id,
      description: "Soporte Fortinet 12 meses",
      quantity: "1",
      unitCostUsd: "100",
      unitSaleUsd: "150",
      pricingSource: "PRECIO",
      coverageStart: new Date("2025-12-01"),
      coverageEnd: new Date(coverageEnd),
    },
  });
  await db.cvVersion.update({
    where: { id: f.version.id },
    data: { status: "APROBADA" },
  });
  if (isOpeningBalance)
    await db.cv.update({ where: { id: f.cv.id }, data: { isOpeningBalance } });
  return { ...f, manager, line };
}

const notices = (userId: string) =>
  db.inboxItem.findMany({
    where: { userId, eventType: "CV_RENOVACION" },
    orderBy: { createdAt: "asc" },
  });

describe("notifyRenewals", () => {
  it("avisa a los 60 días al vendedor y al gerente del área, y no repite", async () => {
    const f = await approvedLine("2027-01-04");
    await notifyRenewals(db, at(TODAY));
    const [seller] = await notices(f.userId);
    expect(seller.title).toContain("una vigencia vence en 60 días");
    expect(seller.body).toContain(
      "Soporte Fortinet 12 meses (hasta 04/01/2027)",
    );
    expect(await notices(f.manager.id)).toHaveLength(1);
    await notifyRenewals(db, at(new Date("2026-11-06T11:00:00Z")));
    expect(await notices(f.userId)).toHaveLength(1);
  });

  it("a los 15 días llega el segundo aviso", async () => {
    const f = await approvedLine("2026-11-20");
    await notifyRenewals(db, at(new Date("2026-09-21T11:00:00Z")));
    await notifyRenewals(db, at(TODAY));
    const titles = (await notices(f.userId)).map((n) => n.title);
    expect(titles).toHaveLength(2);
    expect(titles[1]).toContain("en 15 días");
  });

  it("no avisa por un CV de saldo inicial", async () => {
    const f = await approvedLine("2026-11-20", true);
    await notifyRenewals(db, at(TODAY));
    expect(await notices(f.userId)).toHaveLength(0);
  });
});
