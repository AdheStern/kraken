// src/domain/notifications/next-attempt.test.ts
// Reintentos del correo (AGENTS.md §7): espera que se duplica, tope de 6 h y abandono al décimo fallo.
import { describe, expect, it } from "vitest";
import { computeNextAttempt, MAX_ATTEMPTS, shouldGiveUp } from "./next-attempt";

const now = new Date("2026-10-15T12:00:00Z");
const waitMinutes = (attempts: number) =>
  (computeNextAttempt(now, attempts).getTime() - now.getTime()) / 60_000;

describe("computeNextAttempt", () => {
  it("duplica la espera tras cada fallo", () => {
    expect([1, 2, 3, 4].map(waitMinutes)).toEqual([1, 2, 4, 8]);
  });

  it("nunca espera más de 6 h", () => {
    expect(waitMinutes(20)).toBe(360);
  });

  it("un intento 0 espera el mínimo", () => {
    expect(waitMinutes(0)).toBe(1);
  });
});

describe("shouldGiveUp", () => {
  it("abandona al décimo fallo", () => {
    expect(shouldGiveUp(MAX_ATTEMPTS - 1)).toBe(false);
    expect(shouldGiveUp(MAX_ATTEMPTS)).toBe(true);
  });
});
