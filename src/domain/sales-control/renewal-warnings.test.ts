// src/domain/sales-control/renewal-warnings.test.ts
// Avisos de renovación (AGENTS.md §2.1 "Vigencia", decisión 2026-11-05): 60 y 15 días antes, una vez cada uno.
import { describe, expect, it } from "vitest";
import { dueRenewalWarning } from "./renewal-warnings";

const THRESHOLDS = [60, 15];

describe("dueRenewalWarning", () => {
  it("no avisa antes del primer umbral", () => {
    expect(dueRenewalWarning(61, THRESHOLDS, [])).toBeNull();
  });

  it("avisa cada umbral una sola vez", () => {
    expect(dueRenewalWarning(60, THRESHOLDS, [])).toEqual({
      days: 60,
      markDays: [60],
    });
    expect(dueRenewalWarning(40, THRESHOLDS, [60])).toBeNull();
    expect(dueRenewalWarning(15, THRESHOLDS, [60])).toEqual({
      days: 15,
      markDays: [15],
    });
    expect(dueRenewalWarning(3, THRESHOLDS, [60, 15])).toBeNull();
  });

  it("con varios umbrales cruzados avisa el más cercano y marca todos", () => {
    expect(dueRenewalWarning(10, THRESHOLDS, [])).toEqual({
      days: 15,
      markDays: [60, 15],
    });
  });

  it("una vigencia ya terminada no avisa", () => {
    expect(dueRenewalWarning(-1, THRESHOLDS, [])).toBeNull();
  });
});
