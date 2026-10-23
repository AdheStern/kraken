// src/features/dashboards/schemas/goal-schema.test.ts
// Meta escrita en la grilla (AGENTS.md §6, reglas 3 y 4): vacía la quita, montos con 2 decimales y horas que
// den minutos enteros.
import { describe, expect, it } from "vitest";
import { goalSchema, parseGoalValue } from "./goal-schema";

describe("meta mensual", () => {
  it("vacía quita la meta", () => {
    expect(parseGoalValue("VENTAS_USD", "  ")).toEqual({ kind: "VACIA" });
  });

  it("lee montos pegados desde Excel con hasta 2 decimales", () => {
    expect(parseGoalValue("VENTAS_USD", "US$ 50.000,5")).toEqual({
      kind: "USD",
      valueUsd: "50000.50",
    });
    expect(parseGoalValue("MARGEN_USD", "10.123")).toEqual({
      kind: "USD",
      valueUsd: "10123.00",
    });
    expect(parseGoalValue("MARGEN_USD", "10,125")).toEqual({
      kind: "USD",
      valueUsd: "10125.00",
    });
  });

  it("rechaza negativos, texto y más de 2 decimales", () => {
    expect(parseGoalValue("VENTAS_USD", "-5")).toHaveProperty("error");
    expect(parseGoalValue("VENTAS_USD", "mucho")).toHaveProperty("error");
    expect(parseGoalValue("VENTAS_USD", "1.555,123")).toHaveProperty("error");
  });

  it("las horas se guardan en minutos enteros", () => {
    expect(parseGoalValue("HORAS_VENDIDAS", "7,5")).toEqual({
      kind: "MINUTOS",
      minutes: 450,
    });
    expect(parseGoalValue("HORAS_VENDIDAS", "1.01")).toHaveProperty("error");
  });

  it("valida área, mes y año", () => {
    const base = { areaId: null, indicator: "VENTAS_USD", value: "1" };
    expect(
      goalSchema.safeParse({ ...base, year: 2026, month: 10 }).success,
    ).toBe(true);
    expect(
      goalSchema.safeParse({ ...base, year: 2026, month: 13 }).success,
    ).toBe(false);
    expect(
      goalSchema.safeParse({ ...base, areaId: "net", year: 2026, month: 1 })
        .success,
    ).toBe(false);
  });
});
