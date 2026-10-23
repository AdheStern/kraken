// src/features/dashboards/schemas/dashboard-filters.test.ts
// Filtros de los tableros en la URL (AGENTS.md §6): periodos válidos, valores por defecto y vuelta al token.
import { describe, expect, it } from "vitest";
import { parseDashboardFilters, periodToken } from "./dashboard-filters";

const clock = { now: () => new Date("2026-10-23T15:00:00Z") };

describe("filtros de los tableros", () => {
  it("lee mes, trimestre y año, y los vuelve a escribir igual", () => {
    for (const token of ["2026-03", "2026-T2", "2025"]) {
      const { period } = parseDashboardFilters({ periodo: token }, clock);
      expect(periodToken(period)).toBe(token);
    }
  });

  it("sin periodo o con uno inválido usa el mes en curso de La Paz", () => {
    for (const periodo of [undefined, "2026-13", "ayer", ["2026", "2025"]]) {
      expect(parseDashboardFilters({ periodo }, clock).period).toEqual({
        kind: "MES",
        year: 2026,
        index: 10,
      });
    }
  });

  it("área, ciudad y desglose; un desglose desconocido vuelve a área", () => {
    expect(
      parseDashboardFilters(
        { area: "a1", ciudad: "", desglose: "comercial" },
        clock,
      ),
    ).toMatchObject({ areaId: "a1", cityId: null, dimension: "COMERCIAL" });
    expect(parseDashboardFilters({ desglose: "color" }, clock).dimension).toBe(
      "AREA",
    );
  });
});

describe("opciones de periodo", () => {
  it("del en curso hacia atrás, con su nombre", async () => {
    const { periodOptions } = await import("./dashboard-filters");
    const months = periodOptions("MES", clock);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ token: "2026-10", label: "octubre 2026" });
    expect(months[11].token).toBe("2025-11");
    expect(periodOptions("TRIMESTRE", clock)[1]).toEqual({
      token: "2026-T3",
      label: "T3 2026",
    });
    expect(periodOptions("ANIO", clock).map((o) => o.token)).toEqual([
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
    ]);
  });
});
