// src/domain/dashboards/term-bags.test.ts
// Foto de los contratos por vigencia activos (AGENTS.md §2.4, §6).
import { describe, expect, it } from "vitest";
import { summarizeTermBags, type TermBag } from "./term-bags";

const bag = (over: Partial<TermBag>): TermBag => ({
  consumedMinutes: 0,
  consumedPct: 0,
  isUncapped: true,
  daysToExpiry: 200,
  ...over,
});

describe("summarizeTermBags", () => {
  it("cuenta activos, sin tope, uso, cerca del tope y vencimientos acumulados", () => {
    const summary = summarizeTermBags(
      [
        bag({ consumedMinutes: 270, daysToExpiry: 20 }),
        bag({
          isUncapped: false,
          consumedMinutes: 100,
          consumedPct: 83,
          daysToExpiry: 45,
        }),
        bag({ isUncapped: false, consumedPct: 79, daysToExpiry: 90 }),
        bag({ daysToExpiry: null }),
      ],
      80,
    );
    expect(summary).toEqual({
      active: 4,
      uncapped: 2,
      usedMinutes: 370,
      nearCap: 1,
      expiring: [
        { days: 30, count: 1 },
        { days: 60, count: 2 },
        { days: 90, count: 3 },
      ],
    });
  });

  it("un contrato sin tope nunca está cerca del tope", () => {
    const summary = summarizeTermBags([bag({ consumedPct: 100 })], 80);
    expect(summary.nearCap).toBe(0);
  });
});
