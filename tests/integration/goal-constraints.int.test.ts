// tests/integration/goal-constraints.int.test.ts
// Restricciones de dash.meta (AGENTS.md §6, regla 4): una meta por área, indicador y mes (también la de la
// empresa, con área nula), mes válido y una sola magnitud según el indicador.
import { randomInt } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createCvFixture, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("dash.meta", () => {
  it("la meta de la empresa no se repite en el mismo mes", async () => {
    const { userId } = await createCvFixture(db);
    // POR QUÉ: la base se comparte entre archivos; un año al azar evita chocar con otras metas de la empresa.
    const goal = {
      areaId: null,
      indicator: "VENTAS_USD" as const,
      year: randomInt(3000, 9000),
      month: 10,
      valueUsd: "50000",
      updatedById: userId,
    };
    await db.goal.create({ data: goal });
    await expect(db.goal.create({ data: goal })).rejects.toThrow();
  });

  it("exige mes válido y la magnitud que corresponde al indicador", async () => {
    const { userId, area } = await createCvFixture(db);
    const base = { areaId: area.id, year: 2026, updatedById: userId };
    await expect(
      db.goal.create({
        data: { ...base, indicator: "VENTAS_USD", month: 13, valueUsd: "1" },
      }),
    ).rejects.toThrow(/meta_mes_ck/);
    await expect(
      db.goal.create({
        data: { ...base, indicator: "HORAS_VENDIDAS", month: 1, valueUsd: "1" },
      }),
    ).rejects.toThrow(/meta_magnitud_ck/);
    await expect(
      db.goal.create({
        data: { ...base, indicator: "MARGEN_USD", month: 1, minutes: 60 },
      }),
    ).rejects.toThrow(/meta_magnitud_ck/);
    await db.goal.create({
      data: { ...base, indicator: "HORAS_VENDIDAS", month: 1, minutes: 1200 },
    });
  });
});
