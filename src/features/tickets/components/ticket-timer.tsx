// src/features/tickets/components/ticket-timer.tsx
// Contador grande del detalle para el tiempo en el ticket mismo (las subtareas tienen el suyo): muestra el que
// corre, sea propio o de otra persona, y los botones del propio; en el móvil queda fijo abajo (AGENTS.md §5, §8).
"use client";

import type { TicketTime } from "../types";
import { RunningTimers } from "./running-timers";
import { splitTimers, timerCaption } from "./split-timers";
import { TimerButtons } from "./timer-buttons";
import { TimerClock } from "./timer-clock";

type Props = { ticketId: string; time: TicketTime };

export function TicketTimer({ ticketId, time }: Props) {
  const onTicket = time.timers.filter((t) => t.subtaskId === null);
  const { mine, shown, rest } = splitTimers(onTicket, time.viewerId);
  const canLog = time.targets.some((t) => t.id === null);
  if (!shown && !canLog) return null;

  return (
    <section
      aria-label="Contador"
      className="kr-solid sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl p-4 sm:static"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <TimerClock
            closedMs={shown?.closedMs ?? 0}
            runningSince={shown?.runningSince ?? null}
            className="block text-4xl"
          />
          <p
            className="truncate text-xs text-muted-foreground"
            aria-live="polite"
          >
            {timerCaption(shown, time.viewerId) ??
              "Sin contador en el ticket. La hora la pone el servidor; cerrar la pestaña no pierde tiempo."}
          </p>
        </div>
        {(mine || canLog) && (
          <TimerButtons
            timer={mine}
            target={canLog ? { ticketId, subtaskId: null } : undefined}
            startLabel={shown ? "Iniciar el mío" : "Iniciar"}
          />
        )}
      </div>
      <RunningTimers timers={rest} />
    </section>
  );
}
