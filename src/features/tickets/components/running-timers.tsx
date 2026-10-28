// src/features/tickets/components/running-timers.tsx
// Contadores en curso de otras personas (en el ticket o en una subtarea), con su cifra que avanza; solo lectura
// (AGENTS.md §2.6: todos los que ven el ticket ven el tiempo en curso).
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import type { TimerView } from "../types";
import { TimerClock } from "./timer-clock";

export function RunningTimers({ timers }: { timers: TimerView[] }) {
  if (timers.length === 0) return null;
  return (
    <ul aria-label="Contadores en curso" className="flex flex-wrap gap-2">
      {timers.map((t) => (
        <li
          key={t.timerId}
          className="flex items-center gap-1.5 rounded-full bg-muted/60 py-0.5 pr-2.5 pl-0.5 text-xs"
        >
          <PersonAvatar
            name={t.person.name}
            image={t.person.image}
            className="size-5 text-[10px]"
          />
          <span className="font-medium">{t.person.name}</span>
          <TimerClock closedMs={t.closedMs} runningSince={t.runningSince} />
          {t.status === "PAUSADO" && (
            <span className="text-muted-foreground">en pausa</span>
          )}
        </li>
      ))}
    </ul>
  );
}
