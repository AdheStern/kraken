// src/domain/dashboards/term-contracts.test.ts
// Contratos por vigencia vendidos: duración por fechas y resumen por duración (AGENTS.md §2.4, §6).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { summarizeTermContracts, toTermMonths } from "./term-contracts";

describe("toTermMonths", () => {
  it("cuenta meses completos con el fin inclusivo", () => {
    expect(toTermMonths("2026-06-01", "2027-05-31")).toBe(12);
    expect(toTermMonths("2026-07-20", "2028-07-19")).toBe(24);
    expect(toTermMonths("2026-12-01", "2026-12-31")).toBe(1);
  });

  it("redondea a meses un periodo que no es de meses completos", () => {
    expect(toTermMonths("2026-03-30", "2027-03-30")).toBe(12);
    expect(toTermMonths("2026-05-04", "2027-05-03")).toBe(12);
    expect(toTermMonths("2026-01-01", "2026-01-05")).toBe(1);
  });

  it("no da duración sin fechas o con el fin antes del inicio", () => {
    expect(toTermMonths(null, "2027-01-01")).toBeNull();
    expect(toTermMonths("2027-01-02", "2026-01-01")).toBeNull();
  });
});

describe("summarizeTermContracts", () => {
  it("suma contratos, meses y venta, y los agrupa por duración", () => {
    const summary = summarizeTermContracts([
      { termMonths: 12, saleUsd: new Decimal("1000.50") },
      { termMonths: 24, saleUsd: new Decimal("3000") },
      { termMonths: 12, saleUsd: new Decimal("500") },
      { termMonths: null, saleUsd: new Decimal("100") },
    ]);
    expect(summary.count).toBe(4);
    expect(summary.months).toBe(48);
    expect(summary.saleUsd.toFixed(2)).toBe("4600.50");
    expect(
      summary.byDuration.map((d) => [d.months, d.count, d.saleUsd.toFixed(2)]),
    ).toEqual([
      [12, 2, "1500.50"],
      [24, 1, "3000.00"],
    ]);
  });

  it("sin contratos devuelve ceros", () => {
    const summary = summarizeTermContracts([]);
    expect([summary.count, summary.months, summary.byDuration]).toEqual([
      0,
      0,
      [],
    ]);
  });
});
