// src/domain/documentation/reorder-phases.test.ts
// Subir o bajar una fase de documentación entre las activas (AGENTS.md §2.10).
import { describe, expect, it } from "vitest";
import { reorderPhases } from "./reorder-phases";

const phases = [
  { id: "a", isActive: true },
  { id: "b", isActive: false },
  { id: "c", isActive: true },
  { id: "d", isActive: true },
];

describe("reorderPhases", () => {
  it("intercambia con la activa vecina y deja la dada de baja en su lugar", () => {
    expect(reorderPhases(phases, "c", "up")).toEqual(["c", "b", "a", "d"]);
    expect(reorderPhases(phases, "c", "down")).toEqual(["a", "b", "d", "c"]);
  });

  it("en el extremo no cambia nada", () => {
    expect(reorderPhases(phases, "a", "up")).toEqual(["a", "b", "c", "d"]);
    expect(reorderPhases(phases, "d", "down")).toEqual(["a", "b", "c", "d"]);
  });

  it("una fase dada de baja o inexistente no se mueve", () => {
    expect(reorderPhases(phases, "b", "up")).toBeNull();
    expect(reorderPhases(phases, "x", "down")).toBeNull();
  });
});
