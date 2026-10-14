// tests/integration/current-fx-rate.int.test.ts
// TC oficial vigente (AGENTS.md §2.2): nunca el que rige mañana y, el mismo día, el del BCB antes que el manual.
import { afterAll, describe, expect, it } from "vitest";
import { findCurrentFxRate } from "@/server/fx/find-current-fx-rate";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const day = (date: string) => new Date(`${date}T00:00:00Z`);

describe("findCurrentFxRate", () => {
  it("toma el último que ya rige, prefiere el del BCB y deja fuera el de mañana", async () => {
    // POR QUÉ: fechas de 2031 que no usa ningún otro test, por la unicidad (fecha, fuente).
    await db.fxRate.createMany({
      data: [
        {
          effectiveOn: day("2031-03-09"),
          buyRate: "6.86",
          sellRate: "6.96",
          source: "CUCU",
        },
        {
          effectiveOn: day("2031-03-10"),
          buyRate: "6.87",
          sellRate: "6.97",
          source: "MANUAL",
        },
        {
          effectiveOn: day("2031-03-10"),
          buyRate: "6.88",
          sellRate: "6.98",
          source: "CUCU",
        },
        {
          effectiveOn: day("2031-03-11"),
          buyRate: "6.90",
          sellRate: "7.00",
          source: "CUCU",
        },
      ],
    });

    const today = await findCurrentFxRate(db, "2031-03-10");
    expect(today?.source).toBe("CUCU");
    expect(today?.sellRate.toFixed(2)).toBe("6.98");

    const dayBefore = await findCurrentFxRate(db, "2031-03-09");
    expect(dayBefore?.sellRate.toFixed(2)).toBe("6.96");
  });
});
