// tests/integration/sales-dashboard.int.test.ts
// Tablero económico contra la base (AGENTS.md §6, §2.9 "Tableros"): versión aprobada vigente fechada en la
// primera aprobación, saldo inicial excluido, PRECIO-01 como venta, alcance por línea y reparto entre vendedores.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getSalesDashboard } from "@/features/dashboards/queries/get-sales-dashboard";
import type { PrismaClient } from "@/generated/prisma/client";
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

// POR QUÉ: la base se comparte entre archivos; 2031 aísla estas ventas de las que otros tests aprueban hoy.
const MARCH = { kind: "MES" as const, year: 2031, index: 3 };

type Line = { areaId: string; cost: string; sale: string };

async function addLines(db: PrismaClient, versionId: string, lines: Line[]) {
  for (const [i, line] of lines.entries()) {
    await db.cvLine.create({
      data: {
        versionId,
        position: i + 1,
        kind: "ITEM",
        areaId: line.areaId,
        description: `Línea ${i + 1}`,
        quantity: "1",
        unitCostUsd: line.cost,
        unitSaleUsd: line.sale,
      },
    });
  }
}

async function approve(versionId: string, approvedAt: string) {
  await db.cvVersion.update({
    where: { id: versionId },
    data: { status: "APROBADA", approvedAt: new Date(approvedAt) },
  });
}

let ids: { net: string; tel: string };
let anaSession: Awaited<ReturnType<typeof createUserWithRoles>>;

beforeAll(async () => {
  const precio01 = await createCvFixture(db);
  const tel = await db.area.create({ data: { code: "TEL-T", name: "Tel" } });
  const net = precio01.area.id;
  const ana = await createUserWithRoles(db, "Ana", [{ code: "COMERCIAL" }]);
  const beto = await createUserWithRoles(db, "Beto", [{ code: "COMERCIAL" }]);
  ids = { net, tel: tel.id };
  anaSession = ana;
  // PRECIO-01 (§15.1): L1 y L3 de DIMANET, L2 de DIMATEL; dos vendedores.
  await addLines(db, precio01.version.id, [
    { areaId: net, cost: "337.59", sale: "985.76" },
    { areaId: tel.id, cost: "45.22", sale: "130.80" },
    { areaId: net, cost: "0", sale: "269.12" },
  ]);
  await db.cvVersionSeller.createMany({
    data: [ana.id, beto.id].map((userId) => ({
      versionId: precio01.version.id,
      userId,
    })),
  });
  await approve(precio01.version.id, "2031-03-10T15:00:00Z");

  // Cerrado en febrero; la v2 aprobada en marzo corrige el monto de febrero.
  const amended = await createCvFixture(db);
  await addLines(db, amended.version.id, [
    { areaId: net, cost: "100", sale: "500" },
  ]);
  await approve(amended.version.id, "2031-02-20T15:00:00Z");
  await db.cvVersion.update({
    where: { id: amended.version.id },
    data: { status: "REEMPLAZADA" },
  });
  const v2 = await createVersion(db, amended.cv.id, amended.userId, 2);
  await addLines(db, v2.id, [{ areaId: net, cost: "200", sale: "1000" }]);
  await approve(v2.id, "2031-03-05T15:00:00Z");

  const opening = await createCvFixture(db);
  await db.cv.update({
    where: { id: opening.cv.id },
    data: { isOpeningBalance: true },
  });
  await addLines(db, opening.version.id, [
    { areaId: net, cost: "0", sale: "999" },
  ]);
  await approve(opening.version.id, "2031-03-12T15:00:00Z");
});

describe("tablero económico", () => {
  it("el GG ve PRECIO-01 en marzo y el CV corregido en febrero; el saldo inicial no es venta", async () => {
    const gg = await createUserWithRoles(db, "GG", [
      { code: "GERENTE_GENERAL" },
    ]);
    const board = await getSalesDashboard(gg, {
      period: MARCH,
      areaId: null,
      cityId: null,
      dimension: "AREA",
    });
    expect(board.sales.valueUsd).toBe("1385.68");
    expect(board.sales.previousUsd).toBe("1000.00");
    expect(board.factor).toBe("2.92");
    expect(board.ownServicesUsd).toBe("269.12");
    expect(board.margin.valueUsd).toBe("733.75");
    expect(board.cvCount).toBe(1);
    expect(board.breakdown.rows.map((r) => [r.key, r.saleUsd])).toEqual([
      [ids.net, "1254.88"],
      [ids.tel, "130.80"],
    ]);
  });

  it("el gerente de área solo ve las líneas de su área y el comercial reparte con su colega", async () => {
    const manager = await createUserWithRoles(db, "Gerente Tel", [
      { code: "GERENTE_AREA", areaId: ids.tel },
    ]);
    const input = { period: MARCH, areaId: null, cityId: null };
    const own = await getSalesDashboard(manager, {
      ...input,
      dimension: "AREA",
    });
    expect(own.sales.valueUsd).toBe("130.80");

    const bySeller = await getSalesDashboard(anaSession, {
      ...input,
      dimension: "COMERCIAL",
    });
    expect(bySeller.breakdown.rows.map((r) => [r.label, r.saleUsd])).toEqual([
      ["Ana", "692.84"],
      ["Beto", "692.84"],
    ]);
  });

  it("el ingeniero no ve montos", async () => {
    const engineer = await createUserWithRoles(db, "Ing", [
      { code: "INGENIERO", areaId: ids.net },
    ]);
    const board = await getSalesDashboard(engineer, {
      period: MARCH,
      areaId: null,
      cityId: null,
      dimension: "AREA",
    });
    expect([board.sales.valueUsd, board.breakdown.rows]).toEqual(["0.00", []]);
  });
});
