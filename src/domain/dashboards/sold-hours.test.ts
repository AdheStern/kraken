// src/domain/dashboards/sold-hours.test.ts
// Horas vendidas de una línea de CV para el tablero de ventas: solo las bolsas de horas (AGENTS.md §2.4, §6).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { toSoldHoursMinutes } from "./sold-hours";

describe("toSoldHoursMinutes", () => {
  it("cuenta la cantidad de una línea de bolsa de horas en minutos", () => {
    expect(toSoldHoursMinutes({ kind: "HORAS" }, new Decimal(50))).toBe(3000);
  });

  it("toma como bolsa de horas la especificación anterior sin kind", () => {
    expect(toSoldHoursMinutes({ modality: "H8X5" }, new Decimal(5))).toBe(300);
  });

  it("no cuenta un contrato por vigencia: su cantidad son meses o años, no horas", () => {
    expect(toSoldHoursMinutes({ kind: "VIGENCIA" }, new Decimal(1))).toBe(0);
  });

  it("no cuenta una línea sin bolsa", () => {
    expect(toSoldHoursMinutes(null, new Decimal(10))).toBe(0);
  });
});
