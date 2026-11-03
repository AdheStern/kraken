// src/features/dashboards/export/engineer-sheets.test.ts
// Exportación del tablero de ingenieros (AGENTS.md §6): una fila por ingeniero con las cifras de la pantalla y las
// horas en decimal desde los minutos guardados.
import { describe, expect, it } from "vitest";
import { engineersSheets } from "./engineer-sheets";

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
      },
    ]);
  });
});
