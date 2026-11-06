// src/domain/dashboards/hours-usage.test.ts
// Uso de las horas vendidas por grupo (decisión 2026-11-05): suma por grupo con summarizeBag, % de uso y primero lo
// que trabaja sin bolsa o más consume.
import { describe, expect, it } from "vitest";
import { hoursUsageBreakdown } from "./hours-usage";

describe("hoursUsageBreakdown", () => {
  it("suma las bolsas de cada grupo y calcula el % de uso", () => {
    const [row] = hoursUsageBreakdown([
      { key: "a", label: "Banco", totals: { APERTURA: 600, CONSUMO: -300 } },
      {
        key: "a",
        label: "Banco",
        totals: { APERTURA: 600, AJUSTE: 0, CONSUMO: -600 },
      },
    ]);
    expect(row).toMatchObject({
      bags: 2,
      soldMinutes: 1200,
      consumedMinutes: 900,
      usagePct: 75,
    });
  });

  it("ordena primero lo que trabaja sin bolsa, luego por uso", () => {
    const rows = hoursUsageBreakdown(
      [
        { key: "a", label: "A", totals: { APERTURA: 100, CONSUMO: -90 } },
        { key: "b", label: "B", totals: { APERTURA: 100, CONSUMO: -10 } },
        { key: "c", label: "C", totals: { APERTURA: 100, VENCIMIENTO: -100 } },
      ],
      new Map([["b", 120]]),
    );
    expect(rows.map((r) => r.key)).toEqual(["b", "a", "c"]);
    expect(rows[2]).toMatchObject({ expiredMinutes: 100, usagePct: 0 });
  });
});
