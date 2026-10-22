// src/domain/dashboards/operations.test.ts
// KPIs operativos y de inventario (AGENTS.md §6): horas con HORAS-01 (§15.2), SLA, resolución, tardíos,
// fuera de horario, utilización, valor del inventario y rotación.
import { fromZonedTime } from "date-fns-tz";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "../calendar/business-calendar";
import { summarizeHoursFlow } from "./hours-kpis";
import { inventoryTurnover, stockValueAt } from "./inventory-kpis";
import { median, sharePct } from "./stats";
import {
  lateEntriesPct,
  medianResolutionMinutes,
  outsideHoursShare,
  slaCompliance,
} from "./ticket-kpis";
import {
  capacityMinutes,
  loggedMinutesIn,
  utilizationPct,
} from "./utilization";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");
const d = (value: number) => new Decimal(value);

// Horario de HORAS-01: lunes a viernes 08:30–18:30, sin franja el fin de semana (§15.2).
const laPaz: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(),
};

const horas01 = [
  { start: lp("2026-10-16T17:30"), end: lp("2026-10-16T18:00") },
  { start: lp("2026-10-16T18:15"), end: lp("2026-10-16T19:30") },
  { start: lp("2026-10-17T10:00"), end: lp("2026-10-17T10:40") },
];

describe("horas y tickets", () => {
  it("HORAS-01: 145 min reales, 45 dentro y 100 fuera del horario", () => {
    const share = outsideHoursShare(
      horas01.map((i) => ({ ...i, calendar: laPaz })),
    );
    expect(share).toEqual({
      insideMinutes: 45,
      outsideMinutes: 100,
      outsidePct: 69,
    });
  });

  it("HORAS-01: 270 ponderados por 145 reales dejan 125 de recargo", () => {
    const flow = summarizeHoursFlow({ APERTURA: 780, CONSUMO: -270 }, 145);
    expect(flow).toEqual({
      soldMinutes: 780,
      consumedWeightedMinutes: 270,
      consumedRealMinutes: 145,
      expiredMinutes: 0,
      surchargeMinutes: 125,
    });
  });

  it("el SLA solo cuenta mediciones cerradas", () => {
    expect(
      slaCompliance(["CUMPLIDO", "CUMPLIDO", "INCUMPLIDO", "EN_CURSO"]),
    ).toEqual({ met: 2, missed: 1, pct: 66.7 });
    expect(slaCompliance(["PAUSADO"]).pct).toBeNull();
  });

  it("mediana de resolución en minutos de calendario y % de tardíos", () => {
    const created = lp("2026-10-12T09:00");
    const after = (minutes: number) => ({
      createdAt: created,
      resolvedAt: new Date(created.getTime() + minutes * 60_000),
    });
    expect(medianResolutionMinutes([after(60), after(180), after(30)])).toBe(
      60,
    );
    expect(medianResolutionMinutes([])).toBeNull();
    expect(
      lateEntriesPct([{ isLate: true }, { isLate: false }, { isLate: false }]),
    ).toBe(33.3);
  });
});

describe("utilización", () => {
  const week = { start: lp("2026-10-12T00:00"), end: lp("2026-10-19T00:00") };

  it("la capacidad son los minutos hábiles de la ciudad, sin feriados", () => {
    expect(capacityMinutes(week, laPaz)).toBe(3000);
    const withHoliday = { ...laPaz, holidays: new Set(["2026-10-14"]) };
    expect(capacityMinutes(week, withHoliday)).toBe(2400);
  });

  it("cuenta solo lo registrado dentro del periodo y puede pasar de 100%", () => {
    const crossing = {
      start: lp("2026-10-11T23:00"),
      end: lp("2026-10-12T01:00"),
    };
    expect(loggedMinutesIn([...horas01, crossing], week)).toBe(205);
    expect(utilizationPct(205, 2400)).toBe(8.5);
    expect(utilizationPct(3300, 3000)).toBe(110);
    expect(utilizationPct(10, 0)).toBeNull();
  });
});

describe("inventario", () => {
  const t1 = new Date("2026-10-01T15:00:00Z");
  const t2 = new Date("2026-10-20T15:00:00Z");
  const points = [
    { stockKey: "A", at: t1, balanceValueUsd: d(100) },
    { stockKey: "B", at: t1, balanceValueUsd: d(50) },
    { stockKey: "A", at: t2, balanceValueUsd: d(60) },
  ];

  it("el valor a una fecha es el último saldo de cada stock antes de ella", () => {
    expect(stockValueAt(points, t1).toNumber()).toBe(0);
    expect(stockValueAt(points, new Date("2026-10-10")).toNumber()).toBe(150);
    expect(stockValueAt(points, new Date("2026-11-01")).toNumber()).toBe(110);
  });

  it("rotación = salidas ÷ valor promedio; sin inventario no hay rotación", () => {
    expect(inventoryTurnover(d(40), d(150), d(110))?.toFixed(2)).toBe("0.31");
    expect(inventoryTurnover(d(40), d(0), d(0))).toBeNull();
  });
});

describe("estadísticos", () => {
  it("mediana par e impar y % con un decimal", () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([5])).toBe(5);
    expect(sharePct(1, 3)).toBe(33.3);
    expect(sharePct(1, 0)).toBeNull();
  });
});
