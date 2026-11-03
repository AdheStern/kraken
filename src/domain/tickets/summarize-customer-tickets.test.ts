// src/domain/tickets/summarize-customer-tickets.test.ts
// Resumen del portal (AGENTS.md §2.11): el mes de negocio es el de La Paz, no el de UTC.
import { describe, expect, it } from "vitest";
import { summarizeCustomerTickets } from "./summarize-customer-tickets";

const now = new Date("2026-11-15T15:00:00Z");

describe("summarizeCustomerTickets", () => {
  it("cuenta abiertos, cerrados del mes y sus horas descontadas", () => {
    expect(
      summarizeCustomerTickets(
        [
          { status: "EN_PROGRESO", closedAt: null, chargedMinutes: 0 },
          { status: "RESUELTO", closedAt: null, chargedMinutes: 0 },
          {
            status: "CERRADO",
            closedAt: new Date("2026-11-03T14:00:00Z"),
            chargedMinutes: 90,
          },
          {
            status: "CERRADO",
            closedAt: new Date("2026-10-20T14:00:00Z"),
            chargedMinutes: 60,
          },
          { status: "CANCELADO", closedAt: null, chargedMinutes: 0 },
        ],
        now,
      ),
    ).toEqual({
      openCount: 2,
      closedThisMonth: 1,
      chargedMinutesThisMonth: 90,
    });
  });

  it("un cierre a las 23:00 del 31 en La Paz es de ese mes aunque en UTC ya sea el siguiente", () => {
    const summary = summarizeCustomerTickets(
      [
        {
          status: "CERRADO",
          closedAt: new Date("2026-11-01T03:00:00Z"),
          chargedMinutes: 30,
        },
      ],
      now,
    );
    expect(summary.closedThisMonth).toBe(0);
  });
});
