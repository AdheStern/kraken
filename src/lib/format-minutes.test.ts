// src/lib/format-minutes.test.ts
// Presentación de minutos enteros como horas (regla 4): miles con coma, como los montos.
import { describe, expect, it } from "vitest";
import { formatMinutes } from "./format-minutes";

describe("formatMinutes", () => {
  it("horas y minutos, con miles agrupados por coma", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(750)).toBe("12 h 30 min");
    expect(formatMinutes(605_000)).toBe("10,083 h 20 min");
    expect(formatMinutes(-120)).toBe("−2 h");
  });
});
