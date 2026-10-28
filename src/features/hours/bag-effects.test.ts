// src/features/hours/bag-effects.test.ts
// Resumen del efecto de una versión sobre sus bolsas, antes de enviarla (AGENTS.md §2.4).
import { describe, expect, it } from "vitest";
import type { BagPlan, BagSpec } from "@/domain/hours/plan-version-bags";
import { summarizeBagEffects } from "./bag-effects";

const SPEC: BagSpec = {
  kind: "HORAS",
  startsOn: null,
  isUncapped: false,
  modality: "H8X5",
  scope: "GENERAL",
  areaIds: [],
  projectId: null,
  expiresOn: null,
};

const names = {
  lineDescription: (id: string) => `línea ${id}`,
  bagDescription: (id: string) => `bolsa ${id}`,
};

describe("summarizeBagEffects", () => {
  it("lista lo que se abre, se ajusta y se cierra", () => {
    const plan: BagPlan = {
      ops: [
        { kind: "OPEN", lineId: "n", minutes: 60, spec: SPEC },
        {
          kind: "ADJUST",
          bagId: "b1",
          lineId: "a",
          deltaMinutes: 600,
          spec: SPEC,
        },
        { kind: "CLOSE", bagId: "b2", deltaMinutes: -30 },
      ],
      issues: [],
    };
    expect(summarizeBagEffects(plan, names, null)).toEqual({
      opened: ["línea n"],
      adjusted: [{ description: "línea a", deltaMinutes: 600 }],
      closed: ["bolsa b2"],
      problem: null,
    });
  });

  it("sin cambios de saldo no hay aviso", () => {
    const plan: BagPlan = {
      ops: [
        {
          kind: "ADJUST",
          bagId: "b1",
          lineId: "a",
          deltaMinutes: 0,
          spec: SPEC,
        },
        { kind: "RELINK", bagId: "b2", lineId: "c" },
      ],
      issues: [],
    };
    expect(summarizeBagEffects(plan, names, null)).toBeNull();
  });

  it("un problema se avisa aunque no haya cambios", () => {
    expect(
      summarizeBagEffects({ ops: [], issues: [] }, names, "Falta la bolsa."),
    ).toMatchObject({ problem: "Falta la bolsa." });
  });
});
