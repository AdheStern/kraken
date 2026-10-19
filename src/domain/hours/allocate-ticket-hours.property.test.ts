// src/domain/hours/allocate-ticket-hours.property.test.ts
// Propiedades de la asignación (AGENTS.md §11): consumo ≤ saldo, conservación de los minutos reales
// y redondeo que nunca reduce el total.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import {
  type AllocationBag,
  allocateTicketHours,
} from "./allocate-ticket-hours";
import { TICKET_ROUNDING_STEP_MINUTES } from "./apply-rounding";

const MINUTE = 60_000;
const FROM = Date.parse("2026-10-01T04:00:00Z");

const LA_PAZ: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(["2026-10-12"]),
};

// Intervalos alineados al minuto, de hasta un día, que pueden solaparse entre personas.
const intervalsArb = fc.array(
  fc
    .record({
      startMinute: fc.integer({ min: 0, max: 14 * 1440 }),
      lengthMinutes: fc.integer({ min: 0, max: 1440 }),
    })
    .map(({ startMinute, lengthMinutes }) => ({
      start: new Date(FROM + startMinute * MINUTE),
      end: new Date(FROM + (startMinute + lengthMinutes) * MINUTE),
    })),
  { maxLength: 6 },
);

const bagsArb = fc.uniqueArray(
  fc.record({
    bagId: fc.uuid(),
    modality: fc.constantFrom("H8X5" as const, "H24X7" as const),
    availableMinutes: fc.integer({ min: 0, max: 3000 }),
    acceptsWorkUntil: fc.option(
      fc
        .integer({ min: 0, max: 14 * 1440 })
        .map((minute) => new Date(FROM + minute * MINUTE)),
    ),
    isSettled: fc.boolean(),
  }),
  { maxLength: 4, selector: (bag) => bag.bagId },
);

const byId = (bags: readonly AllocationBag[]) =>
  new Map(bags.map((bag) => [bag.bagId, bag]));

describe("allocateTicketHours · propiedades", () => {
  it("ninguna bolsa recibe más que su saldo y una firme nunca absorbe redondeo", () => {
    fc.assert(
      fc.property(intervalsArb, bagsArb, (intervals, bags) => {
        const bagsById = byId(bags);
        for (const c of allocateTicketHours(intervals, bags, LA_PAZ)
          .consumptions) {
          const bag = bagsById.get(c.bagId);
          expect(c.minutes).toBeLessThanOrEqual(bag?.availableMinutes ?? -1);
          if (c.isSettled) expect(c.roundingMinutes).toBe(0);
        }
      }),
    );
  });

  it("en 24x7 los minutos reales se conservan entre bolsas y pendiente", () => {
    const bags24x7 = bagsArb.map((bags) =>
      bags.map((bag) => ({ ...bag, modality: "H24X7" as const })),
    );
    fc.assert(
      fc.property(intervalsArb, bags24x7, (intervals, bags) => {
        const result = allocateTicketHours(intervals, bags, LA_PAZ);
        const assigned = result.consumptions.reduce(
          (sum, c) => sum + c.minutes - c.roundingMinutes,
          0,
        );
        const { insideMinutes, outsideMinutes } = result.pending;
        expect(assigned + insideMinutes + outsideMinutes).toBe(
          result.realMinutes,
        );
      }),
    );
  });

  it("el redondeo nunca reduce el total y completa un múltiplo de 30 con lo perdonado", () => {
    fc.assert(
      fc.property(intervalsArb, bagsArb, (intervals, bags) => {
        const result = allocateTicketHours(intervals, bags, LA_PAZ);
        const rounded = result.chargedMinutes + result.waivedRoundingMinutes;
        expect(result.chargedMinutes).toBeGreaterThanOrEqual(
          result.weightedMinutes,
        );
        expect(rounded % TICKET_ROUNDING_STEP_MINUTES).toBe(0);
        expect(rounded - result.weightedMinutes).toBeLessThan(
          TICKET_ROUNDING_STEP_MINUTES,
        );
      }),
    );
  });
});
