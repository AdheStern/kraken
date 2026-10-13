// src/domain/hours/bag-figures.test.ts
// Cifras de una bolsa y su clasificación de riesgo (AGENTS.md §2.4, §6).
import { describe, expect, it } from "vitest";
import { classifyBagRisk } from "./classify-bag-risk";
import { summarizeBag } from "./summarize-bag";

const SETTINGS = { riskPct: 80, warningDays: 30 };
const TODAY = "2026-10-13";

describe("summarizeBag", () => {
  it("vendido incluye ajustes; consumido descuenta reversos", () => {
    expect(
      summarizeBag(
        { APERTURA: 1200, AJUSTE: 600, CONSUMO: -900, REVERSO: 60 },
        960,
      ),
    ).toEqual({
      soldMinutes: 1800,
      consumedMinutes: 840,
      expiredMinutes: 0,
      balanceMinutes: 960,
      consumedPct: 46,
    });
  });

  it("trunca el %: 79.9% se muestra 79", () => {
    expect(
      summarizeBag({ APERTURA: 1000, CONSUMO: -799 }, 201).consumedPct,
    ).toBe(79);
  });

  it("registra lo vencido y no pasa de 100%", () => {
    const figures = summarizeBag(
      { APERTURA: 600, CONSUMO: -100, VENCIMIENTO: -500 },
      0,
    );
    expect(figures.expiredMinutes).toBe(500);
    expect(figures.consumedPct).toBe(100);
  });

  it("sin horas vendidas el % es 0", () => {
    expect(summarizeBag({}, 0).consumedPct).toBe(0);
  });
});

describe("classifyBagRisk", () => {
  const bag = (patch = {}) => ({
    status: "ACTIVA" as const,
    soldMinutes: 1000,
    balanceMinutes: 500,
    expiresOn: null,
    ...patch,
  });

  it("una bolsa activa con consumo bajo y sin vencimiento cercano está activa", () => {
    expect(classifyBagRisk(bag(), TODAY, SETTINGS)).toEqual({
      group: "ACTIVA",
      reasons: [],
    });
  });

  it("80% consumido o vencimiento en 30 días la ponen en riesgo", () => {
    expect(
      classifyBagRisk(
        bag({ balanceMinutes: 200, expiresOn: "2026-11-12" }),
        TODAY,
        SETTINGS,
      ),
    ).toEqual({ group: "EN_RIESGO", reasons: ["CONSUMO", "VENCIMIENTO"] });
    expect(
      classifyBagRisk(bag({ balanceMinutes: 201 }), TODAY, SETTINGS).group,
    ).toBe("ACTIVA");
  });

  it.each([
    "AGOTADA",
    "VENCIDA",
    "CERRADA",
  ] as const)("%s es inactiva", (status) => {
    expect(classifyBagRisk(bag({ status }), TODAY, SETTINGS).group).toBe(
      "INACTIVA",
    );
  });
});
