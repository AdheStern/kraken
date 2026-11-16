// src/domain/pricing/sum-amounts.test.ts
// Suma de GROSS UP y RET DIMA en la tarjeta de totales del CV (AGENTS.md §2.1).
import { describe, expect, it } from "vitest";
import { sumAmounts } from "./sum-amounts";

describe("sumAmounts", () => {
  it("suma los montos con hasta 2 decimales, sin errores de coma flotante", () => {
    expect(sumAmounts(["0.10", "0.20", "74.15"]).toFixed(2)).toBe("74.45");
  });

  it("ignora lo vacío y lo que todavía no es un monto válido", () => {
    expect(sumAmounts(["", " 12.5 ", "abc", "-3", "1.234"]).toFixed(2)).toBe(
      "12.50",
    );
  });

  it("sin montos da 0", () => {
    expect(sumAmounts([]).toFixed(2)).toBe("0.00");
  });
});
