// src/features/sales-control/export-observations.test.ts
// Observaciones del Excel: nota, rango de activación (dd/mm/aaaa, sin correr el día) y seriales (AGENTS.md §2.1).
import { describe, expect, it } from "vitest";
import { exportObservations } from "./export-observations";

const empty = {
  notes: null,
  activationStart: null,
  activationEnd: null,
  serials: [],
};

describe("exportObservations", () => {
  it("une nota, rango de activación y seriales, uno por renglón", () => {
    expect(
      exportObservations({
        notes: "Entrega en dos partes",
        activationStart: new Date("2026-11-01T00:00:00Z"),
        activationEnd: new Date("2026-11-15T00:00:00Z"),
        serials: ["FOC1", "FOC2"],
      }),
    ).toBe(
      "Entrega en dos partes\nActivación: 01/11/2026 – 15/11/2026\nS/N: FOC1, FOC2",
    );
  });

  it("sin datos queda vacía y sin rango no agrega el renglón", () => {
    expect(exportObservations(empty)).toBe("");
    expect(exportObservations({ ...empty, serials: ["A1"] })).toBe("S/N: A1");
  });
});
