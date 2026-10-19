// src/domain/sla/compute-sla.property.test.ts
// Propiedades del reloj del SLA (AGENTS.md §2.7, §11): lo transcurrido no retrocede con el tiempo, nunca supera
// el tiempo real y una espera del cliente no suma.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";
import { computeSla } from "./compute-sla";

const MINUTE = 60_000;
const FROM = Date.parse("2026-10-01T04:00:00Z");
const LA_PAZ: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(),
};
const STATUSES: TicketStatus[] = [
  "ASIGNADO",
  "EN_PROGRESO",
  "EN_ESPERA_CLIENTE",
];

// Historial: alta y hasta 5 cambios de estado en los 5 días siguientes.
const historyArb = fc
  .array(
    fc.record({
      to: fc.constantFrom(...STATUSES),
      minute: fc.integer({ min: 1, max: 5 * 1440 }),
    }),
    { maxLength: 5 },
  )
  .map((changes) => [
    { to: "NUEVO" as TicketStatus, at: new Date(FROM) },
    ...changes
      .sort((a, b) => a.minute - b.minute)
      .map((c) => ({ to: c.to, at: new Date(FROM + c.minute * MINUTE) })),
  ]);

const resolution = (
  events: { to: TicketStatus; at: Date }[],
  nowMinute: number,
  modality: "H8X5" | "H24X7",
) =>
  computeSla({
    events,
    firstPublicCommentAt: null,
    modality,
    targets: { firstResponseMinutes: 60, resolutionMinutes: 600 },
    calendar: LA_PAZ,
    now: new Date(FROM + nowMinute * MINUTE),
  })[1].elapsedMinutes;

describe("computeSla · propiedades", () => {
  it("lo transcurrido no retrocede y nunca supera el tiempo real", () => {
    fc.assert(
      fc.property(
        historyArb,
        fc.integer({ min: 0, max: 7 * 1440 }),
        fc.integer({ min: 0, max: 1440 }),
        fc.constantFrom("H8X5" as const, "H24X7" as const),
        (events, now, later, modality) => {
          const before = resolution(events, now, modality);
          expect(
            resolution(events, now + later, modality),
          ).toBeGreaterThanOrEqual(before);
          expect(before).toBeLessThanOrEqual(now);
        },
      ),
    );
  });

  it("una espera del cliente insertada nunca suma tiempo", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 * 1440 }),
        fc.integer({ min: 1, max: 1440 }),
        (pauseAt, pauseLength) => {
          const base = [{ to: "NUEVO" as TicketStatus, at: new Date(FROM) }];
          const paused = [
            ...base,
            {
              to: "EN_ESPERA_CLIENTE" as TicketStatus,
              at: new Date(FROM + pauseAt * MINUTE),
            },
            {
              to: "EN_PROGRESO" as TicketStatus,
              at: new Date(FROM + (pauseAt + pauseLength) * MINUTE),
            },
          ];
          const now = 5 * 1440;
          expect(resolution(paused, now, "H24X7")).toBe(
            resolution(base, now, "H24X7") - pauseLength,
          );
        },
      ),
    );
  });
});
