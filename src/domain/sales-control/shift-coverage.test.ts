// src/domain/sales-control/shift-coverage.test.ts
// Vigencia del periodo siguiente al renovar (AGENTS.md §2.1 "Vigencia", decisión 2026-11-05).
import { describe, expect, it } from "vitest";
import { shiftCoverage } from "./shift-coverage";

describe("shiftCoverage", () => {
  it("un año de meses completos se renueva por un año, aunque cruce un bisiesto", () => {
    expect(shiftCoverage({ start: "2026-12-01", end: "2027-11-30" })).toEqual({
      start: "2027-12-01",
      end: "2028-11-30",
    });
  });

  it("los meses completos que empiezan a mitad de mes también", () => {
    expect(shiftCoverage({ start: "2026-03-15", end: "2026-06-14" })).toEqual({
      start: "2026-06-15",
      end: "2026-09-14",
    });
  });

  it("cualquier otro periodo se renueva por los mismos días", () => {
    expect(shiftCoverage({ start: "2026-01-01", end: "2026-01-10" })).toEqual({
      start: "2026-01-11",
      end: "2026-01-20",
    });
  });
});
