// src/features/tickets/components/split-timers.ts
// Qué contador se muestra en grande en el ticket o en una subtarea: el propio si existe; si no, el de otra persona
// que corre (o el último en pausa). El resto va como fichas (AGENTS.md §2.6: todos ven el tiempo en curso).
import type { TimerView } from "../types";

export function splitTimers(timers: readonly TimerView[], viewerId: string) {
  const mine = timers.find((t) => t.person.id === viewerId);
  const others = timers.filter((t) => t.person.id !== viewerId);
  const shown =
    mine ?? others.find((t) => t.status === "CORRIENDO") ?? others.at(-1);
  return { mine, shown, rest: timers.filter((t) => t !== shown) };
}

export function timerCaption(
  timer: TimerView | undefined,
  viewerId: string,
): string | null {
  if (!timer) return null;
  const status = timer.status === "CORRIENDO" ? "Corriendo" : "En pausa";
  return timer.person.id === viewerId
    ? `${status} · tu contador`
    : `${status} · ${timer.person.name}`;
}
