// src/features/tickets/components/header-timer.tsx
// Contador global de la barra superior: el contador abierto del usuario (el que corre o, si no, el último en
// pausa) con su cifra, enlace al ticket y botones. Va dentro de un <Suspense> (AGENTS.md §2.6).
import Link from "next/link";
import { requireUser } from "@/server/session";
import { listOpenTimers } from "../queries/list-open-timers";
import { TimerButtons } from "./timer-buttons";
import { TimerClock } from "./timer-clock";

export async function HeaderTimer() {
  const user = await requireUser();
  const timers = await listOpenTimers({ userId: user.id });
  const timer = timers.find((t) => t.status === "CORRIENDO") ?? timers.at(-1);
  if (!timer) return null;
  return (
    <div className="flex items-center gap-2 rounded-full bg-muted/60 py-0.5 pr-0.5 pl-3 text-xs">
      <Link
        href={`/tickets/${timer.ticketId}`}
        className="flex min-w-0 items-center gap-1.5 hover:underline"
        title={timer.subtaskTitle ?? timer.ticketTitle}
      >
        <TimerClock
          closedMs={timer.closedMs}
          runningSince={timer.runningSince}
          className="text-sm"
        />
        <span className="hidden max-w-48 truncate text-muted-foreground sm:inline">
          #{timer.ticketNumber} · {timer.subtaskTitle ?? timer.ticketTitle}
        </span>
      </Link>
      <TimerButtons size="sm" timer={timer} />
    </div>
  );
}
