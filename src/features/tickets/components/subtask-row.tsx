// src/features/tickets/components/subtask-row.tsx
// Fila de una subtarea: título, asignado, su propio contador (el del usuario, con botones, y los de otros en
// curso) y su estado (AGENTS.md §2.6 subtareas y registro de tiempo).
"use client";

import type { ReactNode } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import type { SubtaskView, TimerView } from "../types";
import { RunningTimers } from "./running-timers";
import { TimerButtons } from "./timer-buttons";
import { TimerClock } from "./timer-clock";

type Props = {
  ticketId: string;
  subtask: SubtaskView;
  timers: TimerView[];
  viewerId: string;
  canLog: boolean;
  status: ReactNode;
};

export function SubtaskRow({
  ticketId,
  subtask,
  timers,
  viewerId,
  canLog,
  status,
}: Props) {
  const mine = timers.find((t) => t.person.id === viewerId);
  const others = timers.filter((t) => t.person.id !== viewerId);
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 text-sm font-medium">
          {subtask.title}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {subtask.assignee && (
            <PersonAvatar
              name={subtask.assignee.name}
              image={subtask.assignee.image}
              className="size-5 text-[10px]"
            />
          )}
          {subtask.assignee?.name ?? "Sin asignar"}
        </span>
        {status}
      </div>
      {(mine || canLog || others.length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {(mine || canLog) && (
            <>
              <TimerClock
                closedMs={mine?.closedMs ?? 0}
                runningSince={mine?.runningSince ?? null}
                className="text-sm"
              />
              <TimerButtons
                size="sm"
                timer={mine}
                target={
                  canLog ? { ticketId, subtaskId: subtask.id } : undefined
                }
              />
            </>
          )}
          <RunningTimers timers={others} />
        </div>
      )}
    </li>
  );
}
