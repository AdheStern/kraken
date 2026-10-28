// src/features/tickets/components/subtask-row.tsx
// Fila de una subtarea: título, asignado, su contador siempre visible (el que corre, propio o de otra persona),
// el botón para iniciar el propio, su estado y, completada, su tiempo total (AGENTS.md §2.6).
"use client";

import type { ReactNode } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { formatMinutes } from "@/lib/format-minutes";
import type { SubtaskView, TimerView } from "../types";
import { RunningTimers } from "./running-timers";
import { splitTimers, timerCaption } from "./split-timers";
import { TimerButtons } from "./timer-buttons";
import { TimerClock } from "./timer-clock";

type Props = {
  ticketId: string;
  subtask: SubtaskView;
  timers: TimerView[];
  totalMinutes: number;
  viewerId: string;
  canLog: boolean;
  status: ReactNode;
};

export function SubtaskRow({
  ticketId,
  subtask,
  timers,
  totalMinutes,
  viewerId,
  canLog,
  status,
}: Props) {
  const { mine, shown, rest } = splitTimers(timers, viewerId);
  const isDone = subtask.status === "COMPLETADA" && !shown;
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
        {isDone ? (
          <span className="flex flex-col items-end leading-tight">
            <span className="text-base font-semibold tabular-nums">
              {formatMinutes(totalMinutes)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Tiempo total
            </span>
          </span>
        ) : (
          <span className="flex flex-col items-end leading-tight">
            <TimerClock
              closedMs={shown?.closedMs ?? 0}
              runningSince={shown?.runningSince ?? null}
              className="text-base"
            />
            <span className="text-[11px] text-muted-foreground">
              {timerCaption(shown, viewerId) ?? "Sin contador"}
            </span>
          </span>
        )}
        {(mine || canLog) && (
          <TimerButtons
            size="sm"
            timer={mine}
            target={canLog ? { ticketId, subtaskId: subtask.id } : undefined}
            startLabel={shown ? "Iniciar el mío" : "Iniciar subtarea"}
          />
        )}
        {status}
      </div>
      <RunningTimers timers={rest} />
    </li>
  );
}
