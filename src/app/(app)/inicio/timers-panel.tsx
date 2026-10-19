// src/app/(app)/inicio/timers-panel.tsx
// Panel de Inicio con los contadores abiertos del ingeniero (corriendo o en pausa) y el ticket de cada uno
// (AGENTS.md §5 "ingeniero → sus tickets con el contador").
import Link from "next/link";
import { TimerClock } from "@/features/tickets/components/timer-clock";
import type { TimerView } from "@/features/tickets/types";

export function TimersPanel({ timers }: { timers: TimerView[] }) {
  return (
    <section
      className="kr-surface flex flex-col rounded-xl"
      aria-labelledby="home-timers"
    >
      <h2 id="home-timers" className="px-5 pt-4 pb-2 text-sm font-semibold">
        Tus contadores
      </h2>
      <ul className="divide-y divide-border/60 px-2 pb-2">
        {timers.map((timer) => (
          <li key={timer.timerId}>
            <Link
              href={`/tickets/${timer.ticketId}`}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  #{timer.ticketNumber} · {timer.ticketTitle}
                </span>
                <span className="text-xs text-muted-foreground">
                  {timer.status === "CORRIENDO" ? "Corriendo" : "En pausa"}
                  {timer.subtaskTitle && ` · ${timer.subtaskTitle}`}
                </span>
              </span>
              <TimerClock
                closedMs={timer.closedMs}
                runningSince={timer.runningSince}
                className="text-lg"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
