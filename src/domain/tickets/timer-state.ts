// src/domain/tickets/timer-state.ts
// Estado de un contador a partir de sus eventos con hora del servidor: corriendo, pausado o terminado, y el
// tiempo acumulado. Regla normativa: AGENTS.md §2.6 (registro de tiempo) y §8 (contador).

export type TimerEventKind = "INICIAR" | "PAUSAR" | "REANUDAR" | "TERMINAR";
export type TimerStatus = "SIN_INICIAR" | "CORRIENDO" | "PAUSADO" | "TERMINADO";

export type TimerEvent = { kind: TimerEventKind; occurredAt: Date };

export type TimerState = {
  status: TimerStatus;
  elapsedMs: number;
  runningSince: Date | null;
};

// REGLA: CORRIENDO ⇄ PAUSADO · CORRIENDO | PAUSADO → TERMINADO (§8); se inicia una sola vez.
const NEXT: Record<
  TimerEventKind,
  Partial<Record<TimerStatus, TimerStatus>>
> = {
  INICIAR: { SIN_INICIAR: "CORRIENDO" },
  PAUSAR: { CORRIENDO: "PAUSADO" },
  REANUDAR: { PAUSADO: "CORRIENDO" },
  TERMINAR: { CORRIENDO: "TERMINADO", PAUSADO: "TERMINADO" },
};

export function nextTimerStatus(
  current: TimerStatus,
  event: TimerEventKind,
): TimerStatus | null {
  return NEXT[event][current] ?? null;
}

// POR QUÉ: los intervalos se derivan de los eventos; cerrar la pestaña no pierde tiempo porque el reloj es
// el del servidor y `now` solo suma el tramo en curso (§2.6).
export function computeTimerState(
  events: readonly TimerEvent[],
  now: Date,
): TimerState {
  let state: TimerState = {
    status: "SIN_INICIAR",
    elapsedMs: 0,
    runningSince: null,
  };
  const ordered = [...events].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
  for (const event of ordered) {
    const status = nextTimerStatus(state.status, event.kind);
    if (!status)
      throw new RangeError(
        `Evento ${event.kind} inválido desde ${state.status}.`,
      );
    const closed = state.runningSince
      ? event.occurredAt.getTime() - state.runningSince.getTime()
      : 0;
    state = {
      status,
      elapsedMs: state.elapsedMs + closed,
      runningSince: status === "CORRIENDO" ? event.occurredAt : null,
    };
  }
  const running = state.runningSince
    ? Math.max(0, now.getTime() - state.runningSince.getTime())
    : 0;
  return { ...state, elapsedMs: state.elapsedMs + running };
}
