// src/domain/hours/allocate-ticket-hours.test.ts
// Bordes de la asignación de horas: sin bolsas, vencimiento, bolsas firmes, redondeo y precisión
// (AGENTS.md §2.4, §2.6; el caso completo está en tests/canon/horas-01.test.ts).
import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import {
  type AllocationBag,
  allocateTicketHours,
} from "./allocate-ticket-hours";
import { applyRounding, roundUpToStep } from "./apply-rounding";
import { toWorkDeadline, toWorkStart } from "./expiry";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");
const span = (from: string, to: string) => ({ start: lp(from), end: lp(to) });

// Lunes a viernes 08:30–18:30.
const LA_PAZ: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(),
};

const bag = (
  bagId: string,
  availableMinutes: number,
  extra: Partial<AllocationBag> = {},
): AllocationBag => ({
  bagId,
  modality: "H8X5",
  availableMinutes,
  acceptsWorkUntil: null,
  isSettled: false,
  ...extra,
});

// Viernes 16/10/2026: 45 min dentro y 60 fuera → 165 ponderados en 8x5.
const FRIDAY = [
  span("2026-10-16T17:30", "2026-10-16T18:00"),
  span("2026-10-16T18:15", "2026-10-16T19:30"),
];

describe("allocateTicketHours", () => {
  it("sin intervalos no consume, no deja pendiente ni redondea", () => {
    expect(allocateTicketHours([], [bag("P1", 600)], LA_PAZ)).toEqual({
      consumptions: [],
      pending: { insideMinutes: 0, outsideMinutes: 0 },
      realMinutes: 0,
      weightedMinutes: 0,
      chargedMinutes: 0,
      waivedRoundingMinutes: 0,
    });
  });

  it("sin bolsas todo va a pendiente en minutos reales y sin redondeo", () => {
    const result = allocateTicketHours(FRIDAY, [], LA_PAZ);
    expect(result.pending).toEqual({ insideMinutes: 45, outsideMinutes: 60 });
    expect(result.chargedMinutes).toBe(0);
    expect(result.waivedRoundingMinutes).toBe(0);
  });

  it("lo que no cabe en las bolsas va a pendiente sin ponderar", () => {
    const result = allocateTicketHours(FRIDAY, [bag("P1", 100)], LA_PAZ);
    // 45 dentro (45) + 27.5 min fuera (55) llenan P1; quedan 32.5 min reales fuera.
    expect(result.consumptions).toEqual([
      { bagId: "P1", minutes: 100, roundingMinutes: 0, isSettled: false },
    ]);
    expect(result.pending).toEqual({ insideMinutes: 0, outsideMinutes: 33 });
    expect(result.waivedRoundingMinutes).toBe(20);
  });

  it("una bolsa no recibe trabajo posterior a su vencimiento", () => {
    const result = allocateTicketHours(
      [span("2026-10-16T23:00", "2026-10-17T01:00")],
      [
        bag("P1", 1000, { acceptsWorkUntil: toWorkDeadline("2026-10-16") }),
        bag("P2", 1000, { modality: "H24X7" }),
      ],
      LA_PAZ,
    );
    expect(result.consumptions).toEqual([
      { bagId: "P1", minutes: 120, roundingMinutes: 0, isSettled: false },
      { bagId: "P2", minutes: 60, roundingMinutes: 0, isSettled: false },
    ]);
  });

  it("un contrato de prioridad 1 recibe el tramo desde su inicio, aunque empiece a mitad del tramo", () => {
    const result = allocateTicketHours(
      [span("2026-10-16T23:00", "2026-10-17T01:00")],
      [
        bag("P1", 1000, { acceptsWorkFrom: toWorkStart("2026-10-17") }),
        bag("P2", 1000),
      ],
      LA_PAZ,
    );
    expect(result.consumptions).toEqual([
      { bagId: "P1", minutes: 120, roundingMinutes: 0, isSettled: false },
      { bagId: "P2", minutes: 120, roundingMinutes: 0, isSettled: false },
    ]);
  });

  it("sin bolsa que acepte el trabajo antes del inicio, solo ese tramo va a pendiente", () => {
    const result = allocateTicketHours(
      [span("2026-10-16T23:00", "2026-10-17T01:00")],
      [bag("P1", 1000, { acceptsWorkFrom: toWorkStart("2026-10-17") })],
      LA_PAZ,
    );
    expect(result.pending).toEqual({ insideMinutes: 0, outsideMinutes: 60 });
    expect(result.consumptions[0].minutes).toBe(120);
  });

  it("una bolsa firme recibe sus minutos pero el redondeo pasa a la siguiente", () => {
    const result = allocateTicketHours(
      FRIDAY,
      [bag("P1", 180, { isSettled: true }), bag("P2", 600)],
      LA_PAZ,
    );
    expect(result.consumptions).toEqual([
      { bagId: "P1", minutes: 165, roundingMinutes: 0, isSettled: true },
      { bagId: "P2", minutes: 15, roundingMinutes: 15, isSettled: false },
    ]);
  });

  it("el redondeo llena la última bolsa usada y sigue con la siguiente con saldo", () => {
    const result = allocateTicketHours(
      FRIDAY,
      [bag("P1", 170), bag("P2", 600)],
      LA_PAZ,
    );
    expect(result.consumptions).toEqual([
      { bagId: "P1", minutes: 170, roundingMinutes: 5, isSettled: false },
      { bagId: "P2", minutes: 10, roundingMinutes: 10, isSettled: false },
    ]);
    expect(result.chargedMinutes).toBe(180);
  });

  it.each([
    [15, 165],
    [50, 200],
    [1, 165],
    [60, 180],
  ])("con paso de %i min el total de 165 queda en %i", (step, charged) => {
    const result = allocateTicketHours(FRIDAY, [bag("P1", 600)], LA_PAZ, step);
    expect(result.chargedMinutes).toBe(charged);
  });

  it("el redondeo que no cabe en ninguna bolsa se perdona", () => {
    const result = allocateTicketHours(FRIDAY, [bag("P1", 170)], LA_PAZ);
    expect(result.chargedMinutes).toBe(170);
    expect(result.waivedRoundingMinutes).toBe(10);
  });

  it("suma el tiempo de dos personas en paralelo", () => {
    const monday = span("2026-10-19T10:00", "2026-10-19T11:00");
    const result = allocateTicketHours(
      [monday, monday],
      [bag("P1", 600, { modality: "H24X7" })],
      LA_PAZ,
    );
    expect(result.realMinutes).toBe(120);
    expect(result.chargedMinutes).toBe(120);
  });

  it("sube al minuto la fracción de un contador con segundos", () => {
    const seconds = {
      start: lp("2026-10-19T10:00:00"),
      end: lp("2026-10-19T10:00:20"),
    };
    expect(allocateTicketHours([seconds], [bag("P1", 600)], LA_PAZ)).toEqual(
      expect.objectContaining({ weightedMinutes: 1, chargedMinutes: 30 }),
    );
    expect(allocateTicketHours([seconds], [], LA_PAZ).pending).toEqual({
      insideMinutes: 1,
      outsideMinutes: 0,
    });
  });

  it.each([-1, 1.5])("rechaza una bolsa con %d minutos", (minutes) => {
    expect(() =>
      allocateTicketHours(FRIDAY, [bag("P1", minutes)], LA_PAZ),
    ).toThrow(RangeError);
  });
});

describe("applyRounding y roundUpToStep", () => {
  it.each([
    [0, 0],
    [1, 30],
    [30, 30],
    [245, 270],
  ])("%i → %i", (minutes, rounded) => {
    expect(roundUpToStep(minutes)).toBe(rounded);
  });

  it.each([0, 2.5])("rechaza un paso de %d min", (step) => {
    expect(() => roundUpToStep(10, step)).toThrow(RangeError);
  });

  it("sin consumo no reparte nada", () => {
    expect(
      applyRounding([{ minutes: 0, availableMinutes: 50, isSettled: false }]),
    ).toEqual({ roundingMinutes: [0], waivedMinutes: 0 });
  });
});

describe("toWorkDeadline", () => {
  it("es las 00:00 en La Paz del día siguiente al vencimiento", () => {
    expect(toWorkDeadline("2026-12-31")).toEqual(
      new Date("2027-01-01T04:00:00Z"),
    );
    expect(toWorkDeadline(null)).toBeNull();
  });
});
