// src/domain/hours/weigh-minutes.test.ts
// Ponderación por modalidad: 8x5 duplica fuera de horario, 24x7 es 1 a 1 (AGENTS.md §2.5).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { weighMinutes } from "./weigh-minutes";

describe("weighMinutes", () => {
  it("en 8x5 una hora pedida a las 20:00 descuenta 2 horas", () => {
    expect(weighMinutes({ insideMinutes: 0, outsideMinutes: 60 }, "H8X5")).toBe(
      120,
    );
  });

  it("en 8x5 un tramo partido pondera cada lado (60 x1 + 60 x2)", () => {
    expect(
      weighMinutes({ insideMinutes: 60, outsideMinutes: 60 }, "H8X5"),
    ).toBe(180);
  });

  it("en 24x7 todo es 1 a 1", () => {
    expect(
      weighMinutes({ insideMinutes: 60, outsideMinutes: 60 }, "H24X7"),
    ).toBe(120);
  });

  it("conserva las fracciones de minuto; el redondeo es de la asignación", () => {
    expect(
      weighMinutes({ insideMinutes: 0, outsideMinutes: 32.5 }, "H24X7"),
    ).toBe(32.5);
  });

  it("rechaza minutos negativos", () => {
    expect(() =>
      weighMinutes({ insideMinutes: -1, outsideMinutes: 0 }, "H8X5"),
    ).toThrow(RangeError);
  });

  it("nunca da menos que los minutos reales", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100_000 }),
        fc.nat({ max: 100_000 }),
        fc.constantFrom("H8X5" as const, "H24X7" as const),
        (insideMinutes, outsideMinutes, modality) =>
          weighMinutes({ insideMinutes, outsideMinutes }, modality) >=
          insideMinutes + outsideMinutes,
      ),
    );
  });
});
