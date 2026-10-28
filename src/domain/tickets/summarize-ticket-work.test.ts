// src/domain/tickets/summarize-ticket-work.test.ts
// Resumen de un ticket (AGENTS.md §2.6): reales por persona y subtarea, descontado neto por bolsa; el caso
// HORAS-01 (§15.2) da 145 min reales y 270 descontados.
import { describe, expect, it } from "vitest";
import { summarizeTicketWork } from "./summarize-ticket-work";

const at = (hhmm: string, day = "2026-10-16") =>
  new Date(`${day}T${hhmm}:00-04:00`);

describe("summarizeTicketWork", () => {
  it("HORAS-01: 145 min reales de dos personas y 270 descontados en dos bolsas", () => {
    const summary = summarizeTicketWork(
      [
        {
          personId: "A",
          subtaskId: null,
          startedAt: at("17:30"),
          endedAt: at("18:00"),
        },
        {
          personId: "A",
          subtaskId: null,
          startedAt: at("18:15"),
          endedAt: at("19:30"),
        },
        {
          personId: "B",
          subtaskId: "S1",
          startedAt: at("10:00", "2026-10-17"),
          endedAt: at("10:40", "2026-10-17"),
        },
      ],
      [
        { bagId: "P1", minutes: -180 },
        { bagId: "P2", minutes: -90 },
      ],
    );
    expect(summary.realMinutes).toBe(145);
    expect(summary.chargedMinutes).toBe(270);
    expect(summary.byPerson.get("A")).toEqual({ minutes: 105, entries: 2 });
    expect(summary.bySubtask.get("S1")).toBe(40);
    expect(summary.byBag.get("P2")).toBe(90);
  });

  it("un reverso anula su consumo y un tramo abierto no suma", () => {
    const summary = summarizeTicketWork(
      [
        {
          personId: "A",
          subtaskId: null,
          startedAt: at("09:00"),
          endedAt: null,
        },
      ],
      [
        { bagId: "P1", minutes: -60 },
        { bagId: "P1", minutes: 60 },
        { bagId: "P1", minutes: -30 },
      ],
    );
    expect(summary.realMinutes).toBe(0);
    expect(summary.chargedMinutes).toBe(30);
  });
});
