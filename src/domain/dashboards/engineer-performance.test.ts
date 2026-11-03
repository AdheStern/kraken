// src/domain/dashboards/engineer-performance.test.ts
// Desempeño de un ingeniero (AGENTS.md §6): recorte al periodo, horario de la ciudad del ticket (como HORAS-01),
// tickets a cargo, descuento atribuido al encargado y serie semanal en La Paz.
import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "../calendar/business-calendar";
import {
  type EngineerEntry,
  type EngineerTicket,
  summarizeEngineer,
} from "./engineer-performance";
import { minutesByWeek } from "./engineer-weekly";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");
const calendar: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(),
};
const october = { start: lp("2026-10-01T00:00"), end: lp("2026-11-01T00:00") };

const entry = (
  start: string,
  end: string,
  over: Partial<EngineerEntry> = {},
): EngineerEntry => ({
  start: lp(start),
  end: lp(end),
  ticketId: "t1",
  source: "CONTADOR",
  isLate: false,
  calendar,
  ...over,
});

const ticket = (over: Partial<EngineerTicket>): EngineerTicket => ({
  id: "t1",
  isOwner: true,
  status: "EN_PROGRESO",
  createdAt: lp("2026-10-05T09:00"),
  resolvedAt: null,
  closedAt: null,
  chargedMinutes: 0,
  slaOutcomes: [],
  ...over,
});

describe("summarizeEngineer", () => {
  it("recorta al periodo y parte el tiempo por el horario de la ciudad del ticket", () => {
    const result = summarizeEngineer({
      window: october,
      capacityMinutes: 600,
      entries: [
        // Viernes 16/10 17:30–19:30 con cierre a las 18:30: 60 dentro y 60 fuera (HORAS-01).
        entry("2026-10-16T17:30", "2026-10-16T19:30"),
        // Cruza el inicio del periodo: solo cuentan los 30 min del 1 de octubre.
        entry("2026-09-30T23:30", "2026-10-01T00:30", {
          ticketId: "t2",
          source: "MANUAL",
          isLate: true,
        }),
      ],
      tickets: [],
      subtasksCompleted: 2,
    });
    expect(result).toMatchObject({
      loggedMinutes: 150,
      insideMinutes: 60,
      outsideMinutes: 90,
      outsidePct: 60,
      utilizationPct: 25,
      participated: 2,
      entries: { total: 2, manual: 1, late: 1, latePct: 50 },
      subtasksCompleted: 2,
    });
    expect([...result.minutesByTicket]).toEqual([
      ["t1", 120],
      ["t2", 30],
    ]);
  });

  it("cuenta los tickets a cargo, atribuye el descuento al encargado y mide su SLA", () => {
    const result = summarizeEngineer({
      window: october,
      capacityMinutes: null,
      entries: [],
      tickets: [
        ticket({ id: "abierto" }),
        ticket({
          id: "cerrado",
          status: "CERRADO",
          resolvedAt: lp("2026-10-05T13:00"),
          closedAt: lp("2026-10-06T10:00"),
          chargedMinutes: 270,
          slaOutcomes: ["CUMPLIDO", "INCUMPLIDO"],
        }),
        ticket({
          id: "de otro",
          isOwner: false,
          status: "CERRADO",
          closedAt: lp("2026-10-07T10:00"),
          chargedMinutes: 90,
        }),
        ticket({
          id: "cerrado antes",
          status: "CERRADO",
          resolvedAt: lp("2026-09-20T10:00"),
          closedAt: lp("2026-09-21T10:00"),
          chargedMinutes: 60,
        }),
      ],
      subtasksCompleted: 0,
    });
    expect(result).toMatchObject({
      utilizationPct: null,
      ownedOpen: 1,
      ownedResolved: 1,
      ownedClosed: 1,
      chargedMinutes: 270,
      sla: { met: 1, missed: 1, pct: 50 },
      medianResolutionMinutes: 240,
    });
  });
});

describe("minutesByWeek", () => {
  it("agrupa por semana de lunes en La Paz y muestra las semanas vacías", () => {
    const weeks = minutesByWeek(
      [
        { start: lp("2026-10-05T09:00"), end: lp("2026-10-05T10:00") },
        // Domingo 18/10 a las 22:00 en La Paz ya es lunes en UTC: sigue en la semana del 12.
        { start: lp("2026-10-18T22:00"), end: lp("2026-10-18T22:30") },
      ],
      { start: lp("2026-10-05T00:00"), end: lp("2026-10-26T00:00") },
    );
    expect(weeks).toEqual([
      { weekStart: "2026-10-05", minutes: 60 },
      { weekStart: "2026-10-12", minutes: 30 },
      { weekStart: "2026-10-19", minutes: 0 },
    ]);
  });
});
