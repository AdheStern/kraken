// tests/integration/fetch-official-fx.int.test.ts
// Job del TC oficial (ADR-09, AGENTS.md §7 fx.fetch-official): guarda el de hoy y el de mañana, no vuelve a
// consultar cuando ya tiene el de hoy y un fallo de la fuente no guarda nada.
import { afterAll, describe, expect, it, vi } from "vitest";
import { fetchOfficialFx } from "@/server/fx/fetch-official-fx";
import type { FxRateProvider } from "@/server/fx/fx-rate-provider";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

// POR QUÉ: fechas de 2032 que no usa ningún otro test, por la unicidad (fecha, fuente).
const clockAt = (iso: string) => ({ now: () => new Date(iso) });

function provider(rates: Awaited<ReturnType<FxRateProvider["fetchOfficial"]>>) {
  return { name: "falso", fetchOfficial: vi.fn(async () => rates) };
}

describe("fetchOfficialFx", () => {
  it("guarda el vigente y el de mañana; la segunda corrida del día no consulta", async () => {
    const source = provider([
      { effectiveOn: "2032-05-10", buyRate: "11.68", sellRate: "11.68" },
      { effectiveOn: "2032-05-11", buyRate: "11.7", sellRate: "11.7" },
    ]);
    // 00:15 en La Paz del 10/05 = 04:15 UTC.
    const clock = clockAt("2032-05-10T04:15:00Z");
    expect(await fetchOfficialFx(db, source, clock)).toEqual({
      status: "guardado",
      dates: ["2032-05-10", "2032-05-11"],
      hasToday: true,
    });
    expect(await fetchOfficialFx(db, source, clock)).toEqual({
      status: "al-dia",
    });
    expect(source.fetchOfficial).toHaveBeenCalledTimes(1);
    const saved = await db.fxRate.findMany({
      where: {
        source: "CUCU",
        effectiveOn: { gte: new Date("2032-05-10T00:00:00Z") },
      },
      orderBy: { effectiveOn: "asc" },
    });
    expect(saved.map((r) => r.sellRate.toFixed(2))).toEqual(["11.68", "11.70"]);
  });

  it("si la fuente falla no guarda nada y el error sube para que pg-boss reintente", async () => {
    const failing = {
      name: "caída",
      fetchOfficial: vi.fn(async () => {
        throw new Error("La API del TC respondió 503.");
      }),
    };
    await expect(
      fetchOfficialFx(db, failing, clockAt("2032-06-01T05:00:00Z")),
    ).rejects.toThrow("503");
    expect(
      await db.fxRate.count({
        where: { effectiveOn: new Date("2032-06-01T00:00:00Z") },
      }),
    ).toBe(0);
  });
});
