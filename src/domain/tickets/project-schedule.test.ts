// src/domain/tickets/project-schedule.test.ts
// Avance por fechas de un proyecto (AGENTS.md §2.6).
import { describe, expect, it } from "vitest";
import { computeProjectSchedule } from "./project-schedule";

describe("computeProjectSchedule", () => {
  it("cuenta el día en curso inclusivo sobre la duración", () => {
    expect(
      computeProjectSchedule("2026-11-01", "2026-11-10", "2026-11-01"),
    ).toEqual({ kind: "EN_CURSO", day: 1, totalDays: 10 });
    expect(
      computeProjectSchedule("2026-11-01", "2026-11-10", "2026-11-10"),
    ).toEqual({ kind: "EN_CURSO", day: 10, totalDays: 10 });
  });

  it("sin fin, sigue en curso sin total", () => {
    expect(computeProjectSchedule("2026-10-31", null, "2026-11-19")).toEqual({
      kind: "EN_CURSO",
      day: 20,
      totalDays: null,
    });
  });

  it("antes del inicio dice cuánto falta y tras el fin cuánto venció", () => {
    expect(
      computeProjectSchedule("2026-12-01", "2026-12-31", "2026-11-29"),
    ).toEqual({ kind: "POR_EMPEZAR", daysToStart: 2 });
    expect(computeProjectSchedule(null, "2026-11-15", "2026-11-19")).toEqual({
      kind: "VENCIDO",
      daysOverdue: 4,
    });
  });

  it("sin inicio ni vencimiento no hay avance", () => {
    expect(computeProjectSchedule(null, null, "2026-11-19")).toEqual({
      kind: "SIN_FECHAS",
    });
    expect(computeProjectSchedule(null, "2026-12-01", "2026-11-19")).toEqual({
      kind: "SIN_FECHAS",
    });
  });
});
