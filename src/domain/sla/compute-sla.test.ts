// src/domain/sla/compute-sla.test.ts
// Reloj del SLA (AGENTS.md §2.7): horario de oficina en 8x5, todo en 24x7, pausa en EN_ESPERA_CLIENTE,
// primera respuesta por EN_PROGRESO o comentario público, resolución y reanudación si no es conforme.
import { fromZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";
import { computeSla, type SlaInput } from "./compute-sla";

const lp = (local: string) => fromZonedTime(local, "America/La_Paz");

// Lunes a viernes 08:30–18:30.
const LA_PAZ: BusinessCalendar = {
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  holidays: new Set(),
};

const sla = (
  events: [TicketStatus, string][],
  now: string,
  extra: Partial<SlaInput> = {},
) =>
  computeSla({
    events: events.map(([to, at]) => ({ to, at: lp(at) })),
    firstPublicCommentAt: null,
    modality: "H8X5",
    targets: { firstResponseMinutes: 60, resolutionMinutes: 240 },
    calendar: LA_PAZ,
    now: lp(now),
    ...extra,
  });

describe("computeSla", () => {
  it("8x5: un ticket del viernes 18:00 vence su primera respuesta el lunes 09:00", () => {
    const [first] = sla([["NUEVO", "2026-10-16T18:00"]], "2026-10-17T12:00");
    expect(first).toMatchObject({
      status: "EN_CURSO",
      elapsedMinutes: 30,
      pct: 50,
    });
    expect(first.dueAt).toEqual(lp("2026-10-19T09:00"));
  });

  it("24x7: corre todo el tiempo y se incumple pasada la meta", () => {
    const [first] = sla([["NUEVO", "2026-10-16T18:00"]], "2026-10-16T19:30", {
      modality: "H24X7",
    });
    expect(first).toMatchObject({
      status: "INCUMPLIDO",
      elapsedMinutes: 90,
      dueAt: null,
    });
  });

  it("la primera respuesta se cumple al pasar a EN_PROGRESO", () => {
    const [first] = sla(
      [
        ["NUEVO", "2026-10-19T09:00"],
        ["ASIGNADO", "2026-10-19T09:10"],
        ["EN_PROGRESO", "2026-10-19T09:40"],
      ],
      "2026-10-19T15:00",
    );
    expect(first).toMatchObject({
      status: "CUMPLIDO",
      elapsedMinutes: 40,
      metAt: lp("2026-10-19T09:40"),
    });
  });

  it("o con el primer comentario público del encargado, si es antes", () => {
    const [first] = sla([["NUEVO", "2026-10-19T09:00"]], "2026-10-19T15:00", {
      firstPublicCommentAt: lp("2026-10-19T09:20"),
    });
    expect(first).toMatchObject({ status: "CUMPLIDO", elapsedMinutes: 20 });
  });

  it("la espera del cliente pausa la resolución y no suma", () => {
    const [, resolution] = sla(
      [
        ["NUEVO", "2026-10-19T09:00"],
        ["EN_PROGRESO", "2026-10-19T09:30"],
        ["EN_ESPERA_CLIENTE", "2026-10-19T10:00"],
      ],
      "2026-10-19T17:00",
    );
    expect(resolution).toMatchObject({
      status: "PAUSADO",
      elapsedMinutes: 60,
      dueAt: null,
    });
  });

  it("se resuelve, y si el cliente no está conforme el reloj se reanuda desde lo acumulado", () => {
    const resolved: [TicketStatus, string][] = [
      ["NUEVO", "2026-10-19T09:00"],
      ["EN_PROGRESO", "2026-10-19T09:30"],
      ["RESUELTO", "2026-10-19T11:00"],
    ];
    expect(sla(resolved, "2026-10-19T16:00")[1]).toMatchObject({
      status: "CUMPLIDO",
      elapsedMinutes: 120,
      metAt: lp("2026-10-19T11:00"),
    });
    const reopened = sla(
      [...resolved, ["EN_PROGRESO", "2026-10-19T15:00"]],
      "2026-10-19T16:00",
    )[1];
    expect(reopened).toMatchObject({ status: "EN_CURSO", elapsedMinutes: 180 });
    expect(reopened.dueAt).toEqual(lp("2026-10-19T17:00"));
  });

  it("resolver sin pasar por EN_PROGRESO también cumple la primera respuesta", () => {
    const [first] = sla(
      [
        ["NUEVO", "2026-10-19T09:00"],
        ["RESUELTO", "2026-10-19T09:45"],
      ],
      "2026-10-19T12:00",
    );
    expect(first).toMatchObject({
      status: "CUMPLIDO",
      metAt: lp("2026-10-19T09:45"),
    });
  });

  it("exige el evento de alta", () => {
    expect(() => sla([], "2026-10-19T12:00")).toThrow(RangeError);
  });
});
