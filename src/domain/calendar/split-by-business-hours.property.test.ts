// src/domain/calendar/split-by-business-hours.property.test.ts
// Propiedades de la partición contra un oráculo minuto a minuto: se conserva el tiempo y cada minuto
// cae del lado correcto del horario (AGENTS.md §11).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "./business-calendar";
import { splitByBusinessHours } from "./split-by-business-hours";

const LA_PAZ_OFFSET_MS = -4 * 60 * 60_000;
const MINUTE = 60_000;
const FROM = Date.parse("2026-10-01T04:00:00Z");

const slotArb = fc
  .record({
    weekday: fc.integer({ min: 1, max: 7 }),
    startMinute: fc.integer({ min: 0, max: 1439 }),
    length: fc.integer({ min: 1, max: 1440 }),
  })
  .map(({ weekday, startMinute, length }) => ({
    weekday,
    startMinute,
    endMinute: Math.min(1440, startMinute + length),
  }));

const calendarArb: fc.Arbitrary<BusinessCalendar> = fc.record({
  slots: fc.array(slotArb, { maxLength: 8 }),
  holidays: fc
    .uniqueArray(fc.integer({ min: 0, max: 20 }), { maxLength: 4 })
    .map((days) => new Set(days.map((d) => civilDate(FROM + d * 86_400_000)))),
});

// Intervalos alineados al minuto, de hasta 3 días, dentro de octubre de 2026.
const intervalArb = fc
  .record({
    startMinute: fc.integer({ min: 0, max: 20 * 1440 }),
    lengthMinutes: fc.integer({ min: 0, max: 3 * 1440 }),
  })
  .map(({ startMinute, lengthMinutes }) => ({
    start: new Date(FROM + startMinute * MINUTE),
    end: new Date(FROM + (startMinute + lengthMinutes) * MINUTE),
  }));

describe("splitByBusinessHours (propiedades)", () => {
  it("los tramos son contiguos, no vacíos, alternados y suman la duración", () => {
    fc.assert(
      fc.property(calendarArb, intervalArb, (calendar, interval) => {
        const segments = splitByBusinessHours(interval, calendar);
        const total = segments.reduce(
          (sum, s) => sum + (s.end.getTime() - s.start.getTime()),
          0,
        );
        expect(total).toBe(interval.end.getTime() - interval.start.getTime());
        segments.forEach((s, i) => {
          expect(s.end > s.start).toBe(true);
          const previous = segments[i - 1];
          if (previous) {
            expect(previous.end.getTime()).toBe(s.start.getTime());
            expect(previous.isInside).not.toBe(s.isInside);
          } else expect(s.start.getTime()).toBe(interval.start.getTime());
        });
      }),
    );
  });

  // POR QUÉ: recorre cada minuto de cada tramo; con la máquina cargada (gancho de push en paralelo a un build)
  // supera los 5 s por defecto sin estar mal.
  it(
    "cada minuto cae del lado que dice el oráculo",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(calendarArb, intervalArb, (calendar, interval) =>
          splitByBusinessHours(interval, calendar).every((s) => {
            for (let t = s.start.getTime(); t < s.end.getTime(); t += MINUTE)
              if (isInsideAt(t, calendar) !== s.isInside) return false;
            return true;
          }),
        ),
      );
    },
  );
});

// POR QUÉ: el oráculo usa el desfase fijo UTC−4 de La Paz (sin horario de verano, ADR-15) en lugar de
// date-fns-tz, para no compartir la ruta de cálculo con la implementación que verifica.
function isInsideAt(instant: number, calendar: BusinessCalendar): boolean {
  const local = new Date(instant + LA_PAZ_OFFSET_MS);
  if (calendar.holidays.has(local.toISOString().slice(0, 10))) return false;
  const weekday = local.getUTCDay() === 0 ? 7 : local.getUTCDay();
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  return calendar.slots.some(
    (slot) =>
      slot.weekday === weekday &&
      slot.startMinute <= minute &&
      minute < slot.endMinute,
  );
}

function civilDate(instant: number): string {
  return new Date(instant + LA_PAZ_OFFSET_MS).toISOString().slice(0, 10);
}
