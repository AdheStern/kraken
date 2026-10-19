// src/domain/tickets/timer-state.test.ts
// Contador por eventos (AGENTS.md §2.6, §8): transiciones permitidas y tiempo acumulado con pausas.
import { describe, expect, it } from "vitest";
import {
  computeTimerState,
  nextTimerStatus,
  type TimerEvent,
} from "./timer-state";

const at = (minute: number) => new Date(Date.UTC(2026, 9, 19, 14, minute));
const ev = (kind: TimerEvent["kind"], minute: number): TimerEvent => ({
  kind,
  occurredAt: at(minute),
});

describe("computeTimerState", () => {
  it("sin eventos no ha iniciado", () => {
    expect(computeTimerState([], at(0))).toEqual({
      status: "SIN_INICIAR",
      elapsedMs: 0,
      runningSince: null,
    });
  });

  it("corriendo suma el tramo en curso hasta ahora", () => {
    expect(computeTimerState([ev("INICIAR", 0)], at(25))).toEqual({
      status: "CORRIENDO",
      elapsedMs: 25 * 60_000,
      runningSince: at(0),
    });
  });

  it("las pausas no suman y el orden de llegada no importa", () => {
    const events = [ev("REANUDAR", 45), ev("INICIAR", 0), ev("PAUSAR", 30)];
    expect(computeTimerState(events, at(60))).toMatchObject({
      status: "CORRIENDO",
      elapsedMs: 45 * 60_000,
      runningSince: at(45),
    });
  });

  it("terminado desde pausado conserva lo acumulado", () => {
    const events = [ev("INICIAR", 0), ev("PAUSAR", 20), ev("TERMINAR", 90)];
    expect(computeTimerState(events, at(120))).toEqual({
      status: "TERMINADO",
      elapsedMs: 20 * 60_000,
      runningSince: null,
    });
  });

  it("rechaza una secuencia imposible", () => {
    expect(() =>
      computeTimerState([ev("INICIAR", 0), ev("REANUDAR", 5)], at(10)),
    ).toThrow(RangeError);
  });
});

describe("nextTimerStatus", () => {
  it.each([
    ["SIN_INICIAR", "INICIAR", "CORRIENDO"],
    ["CORRIENDO", "PAUSAR", "PAUSADO"],
    ["PAUSADO", "REANUDAR", "CORRIENDO"],
    ["CORRIENDO", "TERMINAR", "TERMINADO"],
    ["PAUSADO", "TERMINAR", "TERMINADO"],
    ["TERMINADO", "REANUDAR", null],
    ["CORRIENDO", "INICIAR", null],
  ] as const)("%s + %s → %s", (from, event, to) => {
    expect(nextTimerStatus(from, event)).toBe(to);
  });
});
