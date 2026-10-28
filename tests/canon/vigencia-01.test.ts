// tests/canon/vigencia-01.test.ts
// Caso canónico VIGENCIA-01 (AGENTS.md §15.5): el ticket de HORAS-01 sobre un contrato por vigencia 8x5 como
// prioridad 1 y la bolsa de horas 041LP-26 (600 min) como prioridad 2: sin tope, con tope y antes del inicio.
// REGLA: no se edita sin cambiar antes la sección 15 de AGENTS.md (regla 13).
import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import {
  type AllocationBag,
  allocateTicketHours,
  UNCAPPED_MINUTES,
} from "@/domain/hours/allocate-ticket-hours";
import { toWorkStart } from "@/domain/hours/expiry";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");

const LA_PAZ: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(),
};

const TICKET = [
  ["2026-10-16T17:30", "2026-10-16T18:00"],
  ["2026-10-16T18:15", "2026-10-16T19:30"],
  ["2026-10-17T10:00", "2026-10-17T10:40"],
].map(([from, to]) => ({ start: lp(from), end: lp(to) }));

const bag = (
  bagId: string,
  availableMinutes: number,
  startsOn: string | null = null,
): AllocationBag => ({
  bagId,
  modality: "H8X5",
  availableMinutes,
  acceptsWorkUntil: null,
  acceptsWorkFrom: toWorkStart(startsOn),
  isSettled: false,
});

const charged = (bags: AllocationBag[]) =>
  Object.fromEntries(
    allocateTicketHours(TICKET, bags, LA_PAZ).consumptions.map((c) => [
      c.bagId,
      c.minutes,
    ]),
  );

describe("VIGENCIA-01", () => {
  it("sin tope: el contrato recibe los 270 min y la bolsa de horas no se toca", () => {
    expect(
      charged([bag("CONTRATO", UNCAPPED_MINUTES), bag("041LP-26", 600)]),
    ).toEqual({ CONTRATO: 270 });
  });

  it("con tope de 120 min: el contrato toma 120 y el resto, con el redondeo, va a 041LP-26 (150)", () => {
    expect(charged([bag("CONTRATO", 120), bag("041LP-26", 600)])).toEqual({
      CONTRATO: 120,
      "041LP-26": 150,
    });
  });

  it("vigente desde el sábado: el viernes va a 041LP-26 (165 + 25 de redondeo) y el sábado al contrato (80)", () => {
    expect(
      charged([
        bag("CONTRATO", UNCAPPED_MINUTES, "2026-10-17"),
        bag("041LP-26", 600),
      ]),
    ).toEqual({ CONTRATO: 80, "041LP-26": 190 });
  });
});
