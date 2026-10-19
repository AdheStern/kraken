// src/domain/tickets/time-entry-rules.test.ts
// Registro manual (AGENTS.md §2.6): rango, futuro, duración máxima y tardío a las 48 h.
import { describe, expect, it } from "vitest";
import { isLateEntry, manualEntryIssue } from "./time-entry-rules";

const h = (hours: number) =>
  new Date(Date.UTC(2026, 9, 19) + hours * 3_600_000);

describe("manualEntryIssue", () => {
  it("acepta un tramo válido en el pasado", () => {
    expect(manualEntryIssue(h(1), h(3), h(10))).toBeNull();
  });

  it.each([
    ["fin igual al inicio", h(1), h(1), h(10)],
    ["fin antes del inicio", h(3), h(1), h(10)],
    ["en el futuro", h(1), h(12), h(10)],
    ["más de 16 h", h(0), h(17), h(20)],
  ])("rechaza %s", (_, start, end, now) => {
    expect(manualEntryIssue(start, end, now)).toEqual(expect.any(String));
  });
});

describe("isLateEntry", () => {
  it("es tardío pasadas 48 h del fin, no antes", () => {
    expect(isLateEntry(h(0), h(48))).toBe(false);
    expect(isLateEntry(h(0), h(48.01))).toBe(true);
  });
});
