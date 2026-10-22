// src/domain/dashboards/period.test.ts
// Periodos de los tableros: límites en La Paz, meses y periodo anterior (AGENTS.md §6, regla 5).
import { describe, expect, it } from "vitest";
import { currentPeriodRef, previousPeriodRef, resolvePeriod } from "./period";

const at = (iso: string) => ({ now: () => new Date(iso) });

describe("periodos", () => {
  it("el mes empieza a la medianoche de La Paz y termina al empezar el siguiente", () => {
    const period = resolvePeriod({ kind: "MES", year: 2026, index: 10 });
    expect(period.start.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(period.months).toEqual(["2026-10"]);
    expect(period.label).toBe("octubre 2026");
  });

  it("el cuarto trimestre cruza al año siguiente", () => {
    const period = resolvePeriod({ kind: "TRIMESTRE", year: 2026, index: 4 });
    expect(period.months).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(period.end.toISOString()).toBe("2027-01-01T04:00:00.000Z");
    expect(period.label).toBe("T4 2026");
  });

  it("el año tiene doce meses", () => {
    const period = resolvePeriod({ kind: "ANIO", year: 2026, index: 1 });
    expect(period.months).toHaveLength(12);
    expect(period.start.toISOString()).toBe("2026-01-01T04:00:00.000Z");
  });

  it("el periodo en curso se toma en La Paz, no en UTC", () => {
    // 1 de noviembre 02:00 UTC = 31 de octubre 22:00 en La Paz.
    const clock = at("2026-11-01T02:00:00Z");
    expect(currentPeriodRef("MES", clock)).toEqual({
      kind: "MES",
      year: 2026,
      index: 10,
    });
    expect(currentPeriodRef("TRIMESTRE", clock).index).toBe(4);
    expect(currentPeriodRef("ANIO", clock)).toEqual({
      kind: "ANIO",
      year: 2026,
      index: 1,
    });
  });

  it("el anterior de enero es diciembre del año previo", () => {
    expect(previousPeriodRef({ kind: "MES", year: 2026, index: 1 })).toEqual({
      kind: "MES",
      year: 2025,
      index: 12,
    });
    expect(
      previousPeriodRef({ kind: "TRIMESTRE", year: 2026, index: 1 }),
    ).toEqual({ kind: "TRIMESTRE", year: 2025, index: 4 });
    expect(previousPeriodRef({ kind: "ANIO", year: 2026, index: 1 }).year).toBe(
      2025,
    );
  });
});
