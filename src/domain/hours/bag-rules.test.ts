// src/domain/hours/bag-rules.test.ts
// Minutos de una línea, estados de la bolsa, umbrales de consumo y vencimiento (AGENTS.md §2.4, §8, §15.4).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  canTransitionBag,
  isTerminalBagStatus,
  nextBagStatus,
} from "./bag-state-machine";
import { crossedThresholds } from "./crossed-thresholds";
import { daysUntilExpiry, isBagExpired, isExpiryWarningDue } from "./expiry";
import { toBagMinutes } from "./to-bag-minutes";

describe("toBagMinutes", () => {
  it.each([
    ["20", 1200],
    ["1.25", 75],
    ["0", 0],
  ])("%s h → %i min", (hours, minutes) => {
    expect(toBagMinutes(new Decimal(hours))).toBe(minutes);
  });

  it.each(["1.01", "-1"])("rechaza %s h", (hours) => {
    expect(toBagMinutes(new Decimal(hours))).toBeNull();
  });
});

describe("estados de la bolsa", () => {
  it("pasa a AGOTADA con saldo 0 y vuelve a ACTIVA con saldo", () => {
    expect(nextBagStatus("ACTIVA", 0)).toBe("AGOTADA");
    expect(nextBagStatus("AGOTADA", 30)).toBe("ACTIVA");
    expect(nextBagStatus("ACTIVA", 30)).toBe("ACTIVA");
    expect(nextBagStatus("AGOTADA", 0)).toBe("AGOTADA");
  });

  it("los estados terminales no cambian por el saldo", () => {
    expect(nextBagStatus("VENCIDA", 30)).toBe("VENCIDA");
    expect(nextBagStatus("CERRADA", 0)).toBe("CERRADA");
    expect(isTerminalBagStatus("VENCIDA")).toBe(true);
    expect(isTerminalBagStatus("AGOTADA")).toBe(false);
  });

  it("rechaza un saldo negativo", () => {
    expect(() => nextBagStatus("ACTIVA", -1)).toThrow(RangeError);
  });

  it("permite vencer o cerrar una bolsa activa o agotada, y nada desde un terminal", () => {
    expect(canTransitionBag("ACTIVA", "VENCIDA")).toBe(true);
    expect(canTransitionBag("AGOTADA", "CERRADA")).toBe(true);
    expect(canTransitionBag("VENCIDA", "ACTIVA")).toBe(false);
    expect(canTransitionBag("CERRADA", "ACTIVA")).toBe(false);
  });
});

describe("crossedThresholds", () => {
  const at = (soldMinutes: number, balanceMinutes: number) => ({
    soldMinutes,
    balanceMinutes,
  });

  it("alerta al cruzar 80% (79% → 81%)", () => {
    expect(crossedThresholds(at(100, 21), at(100, 19), [80, 100])).toEqual([
      80,
    ]);
  });

  it("alerta al 100% exacto y una sola vez cada umbral", () => {
    expect(crossedThresholds(at(100, 5), at(100, 0), [100, 80])).toEqual([100]);
    expect(crossedThresholds(at(100, 50), at(100, 0), [100, 80])).toEqual([
      80, 100,
    ]);
  });

  it("no alerta cuando el consumo baja (REVERSO o AJUSTE a favor)", () => {
    expect(crossedThresholds(at(100, 10), at(100, 40), [80, 100])).toEqual([]);
    expect(crossedThresholds(at(100, 10), at(200, 110), [80])).toEqual([]);
  });

  it("vuelve a alertar si cruza otra vez tras un ajuste", () => {
    expect(crossedThresholds(at(200, 110), at(200, 30), [80])).toEqual([80]);
  });

  it("una bolsa sin horas vendidas no alerta", () => {
    expect(crossedThresholds(at(0, 0), at(0, 0), [80, 100])).toEqual([]);
  });
});

describe("vencimiento", () => {
  it("vale todo el día del vencimiento y vence al día siguiente", () => {
    expect(isBagExpired("2026-10-31", "2026-10-31")).toBe(false);
    expect(isBagExpired("2026-10-31", "2026-11-01")).toBe(true);
    expect(isBagExpired(null, "2030-01-01")).toBe(false);
  });

  it("cuenta los días por fecha civil", () => {
    expect(daysUntilExpiry("2026-11-12", "2026-10-13")).toBe(30);
    expect(daysUntilExpiry("2026-10-12", "2026-10-13")).toBe(-1);
  });

  it("avisa desde 30 días antes hasta el día del vencimiento", () => {
    expect(isExpiryWarningDue("2026-11-12", "2026-10-13", 30)).toBe(true);
    expect(isExpiryWarningDue("2026-11-13", "2026-10-13", 30)).toBe(false);
    expect(isExpiryWarningDue("2026-10-13", "2026-10-13", 30)).toBe(true);
    expect(isExpiryWarningDue("2026-10-12", "2026-10-13", 30)).toBe(false);
    expect(isExpiryWarningDue(null, "2026-10-13", 30)).toBe(false);
  });

  it("rechaza fechas que no son civiles", () => {
    expect(() => isBagExpired("2026-13-45", "2026-10-13")).toThrow(RangeError);
    expect(() => isBagExpired("31/10/2026", "2026-10-13")).toThrow(RangeError);
  });
});
