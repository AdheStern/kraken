// src/domain/calendar/add-business-minutes.test.ts
// Minutos de oficina sumados a un instante y medidos entre dos (AGENTS.md §2.7 reloj 8x5).
import { fromZonedTime } from "date-fns-tz";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addBusinessMinutes, businessMsBetween } from "./add-business-minutes";
import type { BusinessCalendar } from "./business-calendar";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");

const LA_PAZ: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(["2026-10-20"]),
};

describe("addBusinessMinutes", () => {
  it("salta la noche, el fin de semana y los feriados", () => {
    expect(addBusinessMinutes(lp("2026-10-16T18:00"), 60, LA_PAZ)).toEqual(
      lp("2026-10-19T09:00"),
    );
    expect(addBusinessMinutes(lp("2026-10-19T18:00"), 60, LA_PAZ)).toEqual(
      lp("2026-10-21T09:00"),
    );
  });

  it("cero minutos es el mismo instante y sin franjas no vence nunca", () => {
    const from = lp("2026-10-19T10:00");
    expect(addBusinessMinutes(from, 0, LA_PAZ)).toBe(from);
    expect(
      addBusinessMinutes(from, 30, { slots: [], holidays: new Set() }),
    ).toBeNull();
  });

  it("propiedad: lo sumado se recupera midiendo entre ambos instantes", () => {
    const FROM = Date.parse("2026-10-01T04:00:00Z");
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 * 1440 }),
        fc.integer({ min: 1, max: 3000 }),
        (startMinute, minutes) => {
          const from = new Date(FROM + startMinute * 60_000);
          const due = addBusinessMinutes(from, minutes, LA_PAZ);
          expect(due).not.toBeNull();
          expect(businessMsBetween(from, due as Date, LA_PAZ)).toBe(
            minutes * 60_000,
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
