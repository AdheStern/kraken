// src/domain/calendar/normalize-slots.test.ts
// Fusión y validación de las franjas de un horario de oficina (AGENTS.md §2.5).
import { describe, expect, it } from "vitest";
import { normalizeSlots } from "./normalize-slots";

describe("normalizeSlots", () => {
  it("ordena por día y hora, y fusiona las franjas solapadas o contiguas", () => {
    const slots = normalizeSlots([
      { weekday: 2, startMinute: 600, endMinute: 700 },
      { weekday: 1, startMinute: 870, endMinute: 1110 },
      { weekday: 1, startMinute: 510, endMinute: 750 },
      { weekday: 1, startMinute: 700, endMinute: 870 },
      { weekday: 2, startMinute: 650, endMinute: 680 },
    ]);
    expect(slots).toEqual([
      { weekday: 1, startMinute: 510, endMinute: 1110 },
      { weekday: 2, startMinute: 600, endMinute: 700 },
    ]);
  });

  it("no fusiona franjas separadas por una pausa ni de días distintos", () => {
    const slots = normalizeSlots([
      { weekday: 1, startMinute: 510, endMinute: 750 },
      { weekday: 1, startMinute: 870, endMinute: 1110 },
      { weekday: 2, startMinute: 0, endMinute: 1440 },
    ]);
    expect(slots).toHaveLength(3);
  });

  it("no modifica el arreglo recibido", () => {
    const input = [
      { weekday: 1, startMinute: 600, endMinute: 700 },
      { weekday: 1, startMinute: 500, endMinute: 650 },
    ];
    normalizeSlots(input);
    expect(input[0]).toEqual({ weekday: 1, startMinute: 600, endMinute: 700 });
  });

  it.each([
    { weekday: 0, startMinute: 0, endMinute: 60 },
    { weekday: 8, startMinute: 0, endMinute: 60 },
    { weekday: 1.5, startMinute: 0, endMinute: 60 },
    { weekday: 1, startMinute: -1, endMinute: 60 },
    { weekday: 1, startMinute: 60, endMinute: 60 },
    { weekday: 1, startMinute: 0, endMinute: 1441 },
    { weekday: 1, startMinute: 0.5, endMinute: 60 },
  ])("rechaza la franja inválida %o", (slot) => {
    expect(() => normalizeSlots([slot])).toThrow(RangeError);
  });
});
