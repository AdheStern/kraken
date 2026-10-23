// src/domain/dashboards/renewals.test.ts
// Renovaciones próximas (AGENTS.md §6): días hasta el fin de vigencia y tramos excluyentes de 30/60/90 días.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { addDays, daysUntil, renewalBands } from "./renewals";

describe("renovaciones", () => {
  it("cuenta días de calendario, también entre meses y años", () => {
    expect(daysUntil("2026-10-23", "2026-10-23")).toBe(0);
    expect(daysUntil("2026-10-23", "2026-11-22")).toBe(30);
    expect(daysUntil("2026-12-31", "2027-01-01")).toBe(1);
    expect(addDays("2026-10-23", 90)).toBe("2027-01-21");
  });

  it("cada renovación cae en un solo tramo", () => {
    const item = (daysLeft: number, sale: number) => ({
      daysLeft,
      saleUsd: new Decimal(sale),
    });
    const bands = renewalBands([
      item(0, 10),
      item(30, 20),
      item(31, 40),
      item(90, 80),
    ]);
    expect(bands.map((b) => [b.days, b.count, b.saleUsd.toNumber()])).toEqual([
      [30, 2, 30],
      [60, 1, 40],
      [90, 1, 80],
    ]);
  });
});
