// src/features/calendar/calendar-schemas.test.ts
// Franjas de un horario: conversión "HH:MM" ↔ minutos, fin a medianoche y solapes (AGENTS.md §2.5).
import { describe, expect, it } from "vitest";
import { officeScheduleSchema } from "./schemas/calendar-schemas";
import { toMinuteOfDay, toTimeText } from "./time-text";

const schedule = (slots: { weekday: number; start: string; end: string }[]) =>
  officeScheduleSchema.safeParse({ id: null, name: "Oficina", slots });

describe("time-text", () => {
  it("convierte HH:MM en minutos y de vuelta", () => {
    expect(toMinuteOfDay("08:30", false)).toBe(510);
    expect(toTimeText(1110)).toBe("18:30");
  });

  it("00:00 como fin es la medianoche siguiente", () => {
    expect(toMinuteOfDay("00:00", true)).toBe(1440);
    expect(toMinuteOfDay("00:00", false)).toBe(0);
    expect(toTimeText(1440)).toBe("00:00");
  });

  it.each(["8:30", "24:00", "12:60", ""])("rechaza %o", (text) => {
    expect(toMinuteOfDay(text, false)).toBeNull();
  });
});

describe("officeScheduleSchema", () => {
  it("acepta franjas con pausa de mediodía y contiguas", () => {
    const result = schedule([
      { weekday: 1, start: "08:30", end: "12:30" },
      { weekday: 1, start: "12:30", end: "13:00" },
      { weekday: 1, start: "14:30", end: "18:30" },
      { weekday: 6, start: "22:00", end: "00:00" },
    ]);
    expect(result.success && result.data.slots).toEqual([
      { weekday: 1, startMinute: 510, endMinute: 750 },
      { weekday: 1, startMinute: 750, endMinute: 780 },
      { weekday: 1, startMinute: 870, endMinute: 1110 },
      { weekday: 6, startMinute: 1320, endMinute: 1440 },
    ]);
  });

  it("rechaza franjas solapadas del mismo día", () => {
    const result = schedule([
      { weekday: 2, start: "08:30", end: "12:30" },
      { weekday: 2, start: "12:00", end: "18:30" },
    ]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("martes");
  });

  it("rechaza una franja que termina antes de empezar", () => {
    const result = schedule([{ weekday: 3, start: "18:30", end: "08:30" }]);
    expect(result.error?.issues[0].message).toContain("miércoles");
  });
});
