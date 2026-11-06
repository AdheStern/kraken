// src/features/dashboards/export/engineer-sheets.test.ts
// Exportación del tablero de ingenieros (AGENTS.md §6): una fila por ingeniero con las cifras de la pantalla y las
// horas en decimal desde los minutos guardados.
import { describe, expect, it } from "vitest";
import { engineerDetailSheets, engineersSheets } from "./engineer-sheets";

describe("engineersSheets", () => {
  it("pasa minutos a horas y deja vacío lo que no tiene base", () => {
    const [sheet] = engineersSheets({
      periodLabel: "marzo 2031",
      rows: [
        {
          userId: "u1",
          name: "Ana Ingeniera",
          loggedMinutes: 150,
          outsidePct: 60,
          utilizationPct: null,
          ownedResolved: 1,
          participated: 2,
          chargedMinutes: 270,
          slaPct: 50,
          medianResolutionMinutes: null,
          latePct: 0,
          satisfiedPct: 100,
        },
      ],
    });
    expect(sheet.name).toBe("Ingenieros marzo 2031");
    expect(sheet.rows).toEqual([
      {
        name: "Ana Ingeniera",
        logged: 2.5,
        utilization: null,
        outside: 60,
        resolved: 1,
        participated: 2,
        charged: 4.5,
        sla: 50,
        median: null,
        late: 0,
        satisfied: 100,
      },
    ]);
  });
});

describe("engineerDetailSheets", () => {
  it("exporta resumen, tickets y semanas; lo descontado solo de tickets cerrados", () => {
    const sheets = engineerDetailSheets({
      periodLabel: "marzo 2031",
      userId: "u1",
      name: "Ana Ingeniera",
      performance: {
        loggedMinutes: 120,
        insideMinutes: 60,
        outsideMinutes: 60,
        outsidePct: 50,
        utilizationPct: 10,
        ownedOpen: 0,
        ownedResolved: 1,
        ownedClosed: 1,
        participated: 2,
        chargedMinutes: 120,
        sla: { met: 1, missed: 0, pct: 100 },
        satisfaction: { answers: 1, satisfiedPct: 100, averageRating: 5 },
        medianResolutionMinutes: 120,
        entries: { total: 1, manual: 0, late: 0, latePct: 0 },
        subtasksCompleted: 0,
      },
      weeks: [{ weekStart: "2031-03-03", minutes: 90 }],
      tickets: [
        {
          id: "t1",
          number: 7,
          title: "VPN",
          customerName: "ACME",
          status: "EN_PROGRESO",
          role: "SUBTAREA",
          myMinutes: 30,
          chargedMinutes: 0,
          slaMissed: true,
          createdAt: "2031-03-03T13:00:00.000Z",
          closedAt: null,
        },
      ],
    });
    expect(sheets.map((s) => s.name)).toEqual([
      "Resumen marzo 2031",
      "Tickets",
      "Semanas",
    ]);
    expect(sheets[1].rows[0]).toMatchObject({
      role: "Subtarea",
      mine: 0.5,
      charged: null,
      slaMissed: "Sí",
    });
    expect(sheets[2].rows).toEqual([{ week: "2031-03-03", hours: 1.5 }]);
  });
});
