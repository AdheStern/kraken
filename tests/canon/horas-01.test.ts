// tests/canon/horas-01.test.ts
// Caso canónico HORAS-01 (AGENTS.md §15.2): partición por horario y ponderación 8x5 del ticket nocturno.
// La asignación a las bolsas P1/P2 y el redondeo a 30 min se agregan con allocateTicketHours (F3).
import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import type {
  BusinessCalendar,
  ScheduleSlot,
} from "@/domain/calendar/business-calendar";
import {
  type BusinessSegment,
  splitByBusinessHours,
} from "@/domain/calendar/split-by-business-hours";
import { weighMinutes } from "@/domain/hours/weigh-minutes";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");

// Horario de ejemplo de La Paz: lunes a viernes 08:30–18:30, sin franja el fin de semana.
const LA_PAZ: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map(
    (weekday): ScheduleSlot => ({ weekday, startMinute: 510, endMinute: 1110 }),
  ),
  holidays: new Set(),
};

// Ing. A pausa de 18:00 a 18:15; Ing. B trabaja el sábado en su subtarea.
const ENGINEER_A = [
  ["2026-10-16T17:30", "2026-10-16T18:00"],
  ["2026-10-16T18:15", "2026-10-16T19:30"],
];
const ENGINEER_B = [["2026-10-17T10:00", "2026-10-17T10:40"]];

function splitAll(intervals: string[][]): BusinessSegment[] {
  return intervals.flatMap(([from, to]) =>
    splitByBusinessHours({ start: lp(from), end: lp(to) }, LA_PAZ),
  );
}

function minutes(segments: BusinessSegment[], isInside: boolean): number {
  return segments
    .filter((s) => s.isInside === isInside)
    .reduce(
      (sum, s) => sum + (s.end.getTime() - s.start.getTime()) / 60_000,
      0,
    );
}

function summarize(segments: BusinessSegment[]) {
  const split = {
    insideMinutes: minutes(segments, true),
    outsideMinutes: minutes(segments, false),
  };
  return {
    ...split,
    realMinutes: split.insideMinutes + split.outsideMinutes,
    weightedMinutes: weighMinutes(split, "H8X5"),
  };
}

describe("HORAS-01 · partición y ponderación", () => {
  it("parte 18:15–19:30 en 18:15–18:30 dentro y 18:30–19:30 fuera", () => {
    const [, second] = ENGINEER_A;
    expect(
      splitByBusinessHours(
        { start: lp(second[0]), end: lp(second[1]) },
        LA_PAZ,
      ),
    ).toEqual([
      {
        start: lp("2026-10-16T18:15"),
        end: lp("2026-10-16T18:30"),
        isInside: true,
      },
      {
        start: lp("2026-10-16T18:30"),
        end: lp("2026-10-16T19:30"),
        isInside: false,
      },
    ]);
  });

  it("Ing. A: 105 min reales (45 dentro, 60 fuera) → 165 ponderados", () => {
    expect(summarize(splitAll(ENGINEER_A))).toEqual({
      insideMinutes: 45,
      outsideMinutes: 60,
      realMinutes: 105,
      weightedMinutes: 165,
    });
  });

  it("Ing. B: sábado 40 min fuera → 80 ponderados", () => {
    expect(summarize(splitAll(ENGINEER_B))).toEqual({
      insideMinutes: 0,
      outsideMinutes: 40,
      realMinutes: 40,
      weightedMinutes: 80,
    });
  });

  it("el ticket suma 145 min reales y 245 ponderados", () => {
    const total = summarize(splitAll([...ENGINEER_A, ...ENGINEER_B]));
    expect(total.realMinutes).toBe(145);
    expect(total.weightedMinutes).toBe(245);
  });

  it.todo(
    "asigna P1 −180 (saldo 0) y P2 −90 (saldo 510) con redondeo a 270 — allocateTicketHours, F3",
  );
});
