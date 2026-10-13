// src/domain/sales-control/cv-code.test.ts
// Formato del código de CV, etiqueta de versión y año de negocio en La Paz.
import { describe, expect, it } from "vitest";
import { toBusinessDate, toBusinessYear } from "../calendar/business-date";
import { toCvCode, toCvVersionLabel } from "./cv-code";

describe("toCvCode", () => {
  it.each([
    [15, "SC", 2026, "015SC-26"],
    [132, "LP", 2025, "132LP-25"],
    [1208, "LP", 2025, "1208LP-25"],
    [1, "CB", 2100, "001CB-00"],
  ])("%i %s %i → %s", (number, cityCode, year, expected) => {
    expect(toCvCode({ number, cityCode, year })).toBe(expected);
  });

  it.each([[0], [-3], [1.5]])("rechaza el correlativo %s", (number) => {
    expect(() => toCvCode({ number, cityCode: "LP", year: 2026 })).toThrow(
      RangeError,
    );
  });
});

describe("toCvVersionLabel", () => {
  it("la v1 no lleva sufijo; desde la v2 sí", () => {
    expect(toCvVersionLabel("132LP-25", 1)).toBe("132LP-25");
    expect(toCvVersionLabel("132LP-25", 2)).toBe("132LP-25 v2");
  });
});

describe("fecha de negocio", () => {
  it("el 1 de enero 02:00 UTC todavía es 31 de diciembre en La Paz (UTC−4)", () => {
    const instant = new Date("2026-01-01T02:00:00Z");
    expect(toBusinessDate(instant)).toBe("2025-12-31");
    expect(toBusinessYear(instant)).toBe(2025);
  });

  it("a las 04:00 UTC ya es el año nuevo", () => {
    expect(toBusinessYear(new Date("2026-01-01T04:00:00Z"))).toBe(2026);
  });
});
