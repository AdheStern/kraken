// src/domain/calendar/split-by-business-hours.test.ts
// Partición por horario de oficina y feriados en America/La_Paz: casos borde (AGENTS.md §2.5).
import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar, ScheduleSlot } from "./business-calendar";
import { splitByBusinessHours } from "./split-by-business-hours";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");

const weekdays = (startMinute: number, endMinute: number): ScheduleSlot[] =>
  [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute, endMinute }));

// Horario de ejemplo de HORAS-01: lunes a viernes 08:30–18:30.
const OFFICE: BusinessCalendar = {
  slots: weekdays(510, 1110),
  holidays: new Set(),
};

const split = (from: string, to: string, calendar = OFFICE) =>
  splitByBusinessHours({ start: lp(from), end: lp(to) }, calendar);

const seg = (from: string, to: string, isInside: boolean) => ({
  start: lp(from),
  end: lp(to),
  isInside,
});

describe("splitByBusinessHours", () => {
  it("parte en el cierre de la oficina (17:30–19:30 con cierre 18:30)", () => {
    expect(split("2026-10-16T17:30", "2026-10-16T19:30")).toEqual([
      seg("2026-10-16T17:30", "2026-10-16T18:30", true),
      seg("2026-10-16T18:30", "2026-10-16T19:30", false),
    ]);
  });

  it("el sábado sin franjas es todo fuera de horario", () => {
    expect(split("2026-10-17T10:00", "2026-10-17T10:40")).toEqual([
      seg("2026-10-17T10:00", "2026-10-17T10:40", false),
    ]);
  });

  it("un feriado cuenta entero como fuera de horario", () => {
    const calendar = { ...OFFICE, holidays: new Set(["2026-10-16"]) };
    expect(split("2026-10-16T10:00", "2026-10-16T11:00", calendar)).toEqual([
      seg("2026-10-16T10:00", "2026-10-16T11:00", false),
    ]);
  });

  it("respeta la pausa de mediodía entre dos franjas", () => {
    const calendar = {
      slots: [...weekdays(510, 750), ...weekdays(870, 1110)],
      holidays: new Set<string>(),
    };
    expect(split("2026-10-16T12:00", "2026-10-16T15:00", calendar)).toEqual([
      seg("2026-10-16T12:00", "2026-10-16T12:30", true),
      seg("2026-10-16T12:30", "2026-10-16T14:30", false),
      seg("2026-10-16T14:30", "2026-10-16T15:00", true),
    ]);
  });

  it("cruza la medianoche y fusiona el tramo fuera de horario", () => {
    expect(split("2026-10-15T23:00", "2026-10-16T09:00")).toEqual([
      seg("2026-10-15T23:00", "2026-10-16T08:30", false),
      seg("2026-10-16T08:30", "2026-10-16T09:00", true),
    ]);
  });

  it("una franja que termina a las 24:00 llega hasta la medianoche", () => {
    const calendar = {
      slots: [{ weekday: 1, startMinute: 1200, endMinute: 1440 }],
      holidays: new Set<string>(),
    };
    expect(split("2026-10-12T22:00", "2026-10-13T02:00", calendar)).toEqual([
      seg("2026-10-12T22:00", "2026-10-13T00:00", true),
      seg("2026-10-13T00:00", "2026-10-13T02:00", false),
    ]);
  });

  it("conserva los segundos de un intervalo dentro del mismo minuto", () => {
    expect(split("2026-10-16T10:00:10", "2026-10-16T10:00:50")).toEqual([
      seg("2026-10-16T10:00:10", "2026-10-16T10:00:50", true),
    ]);
  });

  it("un intervalo vacío no tiene tramos", () => {
    expect(split("2026-10-16T10:00", "2026-10-16T10:00")).toEqual([]);
  });

  it("rechaza un intervalo invertido o con fechas inválidas", () => {
    expect(() => split("2026-10-16T11:00", "2026-10-16T10:00")).toThrow(
      RangeError,
    );
    expect(() =>
      splitByBusinessHours(
        { start: new Date(Number.NaN), end: new Date() },
        OFFICE,
      ),
    ).toThrow(RangeError);
  });
});
