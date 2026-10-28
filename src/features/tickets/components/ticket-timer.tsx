// src/features/tickets/components/ticket-timer.tsx
// Contador grande del detalle para el tiempo en el ticket mismo (las subtareas tienen el suyo): el propio con sus
// botones y los de otras personas en curso; en el móvil queda fijo abajo (AGENTS.md §5 "Contador grande", §8).
"use client";

import type { TicketTime } from "../types";
import { RunningTimers } from "./running-timers";
import { TimerButtons } from "./timer-buttons";
import { TimerClock } from "./timer-clock";

type Props = { ticketId: string; time: TicketTime };

export function TicketTimer({ ticketId, time }: Props) {
  const onTicket = time.timers.filter((t) => t.subtaskId === null);
  const mine = onTicket.find((t) => t.person.id === time.viewerId);
  const others = onTicket.filter((t) => t.person.id !== time.viewerId);
  const canLog = time.targets.some((t) => t.id === null);
  if (!mine && !canLog && others.length === 0) return null;

  return (
    <section
      aria-label="Contador"
      className="kr-solid sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl p-4 sm:static"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <TimerClock
            closedMs={mine?.closedMs ?? 0}
            runningSince={mine?.runningSince ?? null}
            className="block text-4xl"
          />
          <p
            className="truncate text-xs text-muted-foreground"
            aria-live="polite"
          >
            {mine
              ? `${mine.status === "CORRIENDO" ? "Corriendo" : "En pausa"} · en el ticket`
              : "Tu contador en el ticket. La hora la pone el servidor; cerrar la pestaña no pierde tiempo."}
          </p>
        </div>
        {(mine || canLog) && (
          <TimerButtons
            timer={mine}
            target={canLog ? { ticketId, subtaskId: null } : undefined}
          />
        )}
      </div>
      <RunningTimers timers={others} />
    </section>
  );
}
