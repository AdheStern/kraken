// src/domain/tickets/summarize-project.test.ts
// Resumen de un proyecto (AGENTS.md §2.6, §6): conteos y avance sin cancelados, horas sumadas de todos sus
// tickets, SLA sobre mediciones cerradas y horas por semana desde el primer registro.
import { describe, expect, it } from "vitest";
import { type ProjectTicket, summarizeProject } from "./summarize-project";

const at = (iso: string) => new Date(`${iso}:00-04:00`);

const ticket = (overrides: Partial<ProjectTicket>): ProjectTicket => ({
  status: "EN_PROGRESO",
  createdAt: at("2026-11-02T08:00"),
  resolvedAt: null,
  entries: [],
  movements: [],
  pendingMinutes: 0,
  slaOutcomes: [],
  ...overrides,
});

describe("summarizeProject", () => {
  it("cuenta por estado y mide el avance sin los cancelados", () => {
    const summary = summarizeProject([
      ticket({ status: "CERRADO" }),
      ticket({ status: "RESUELTO" }),
      ticket({ status: "ASIGNADO" }),
      ticket({ status: "CANCELADO" }),
    ]);
    expect(summary.tickets).toEqual({
      total: 4,
      open: 1,
      resolved: 1,
      closed: 1,
      cancelled: 1,
    });
    expect(summary.progressPct).toBe(66.7);
  });

  it("suma horas reales, descontadas y sin bolsa de todos los tickets", () => {
    const summary = summarizeProject([
      ticket({
        status: "CERRADO",
        createdAt: at("2026-11-02T08:00"),
        resolvedAt: at("2026-11-02T12:00"),
        entries: [
          {
            personId: "A",
            subtaskId: null,
            startedAt: at("2026-11-02T09:00"),
            endedAt: at("2026-11-02T10:00"),
          },
        ],
        movements: [{ bagId: "P1", minutes: -60 }],
        slaOutcomes: ["CUMPLIDO", "INCUMPLIDO"],
      }),
      ticket({
        status: "CERRADO",
        createdAt: at("2026-11-09T08:00"),
        resolvedAt: at("2026-11-09T16:00"),
        entries: [
          {
            personId: "B",
            subtaskId: "S",
            startedAt: at("2026-11-10T09:00"),
            endedAt: at("2026-11-10T09:45"),
          },
        ],
        movements: [{ bagId: "P1", minutes: -60 }],
        pendingMinutes: 30,
        slaOutcomes: ["CUMPLIDO", "EN_CURSO"],
      }),
    ]);
    expect(summary.realMinutes).toBe(105);
    expect(summary.chargedMinutes).toBe(120);
    expect(summary.pendingMinutes).toBe(30);
    expect(summary.byBag.get("P1")).toBe(120);
    expect(summary.byPerson.get("B")).toEqual({ minutes: 45, entries: 1 });
    expect(summary.sla).toEqual({ met: 2, missed: 1, pct: 66.7 });
    expect(summary.medianResolutionMinutes).toBe(360);
    expect(summary.weeks).toEqual([
      { weekStart: "2026-11-02", minutes: 60 },
      { weekStart: "2026-11-09", minutes: 45 },
    ]);
  });

  it("un proyecto sin tickets no tiene avance ni semanas", () => {
    const summary = summarizeProject([]);
    expect(summary.progressPct).toBeNull();
    expect(summary.weeks).toEqual([]);
    expect(summary.medianResolutionMinutes).toBeNull();
  });

  it("ignora los registros abiertos en las semanas", () => {
    const summary = summarizeProject([
      ticket({
        entries: [
          {
            personId: "A",
            subtaskId: null,
            startedAt: at("2026-11-02T09:00"),
            endedAt: null,
          },
        ],
      }),
    ]);
    expect(summary.weeks).toEqual([]);
    expect(summary.realMinutes).toBe(0);
  });
});
