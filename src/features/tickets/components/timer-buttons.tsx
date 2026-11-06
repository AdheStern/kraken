// src/features/tickets/components/timer-buttons.tsx
// Botones de un contador propio según su estado (iniciar, pausar, reanudar, terminar); los usan el contador del
// ticket, cada subtarea y la cabecera (AGENTS.md §8 contador).
"use client";

import { LoaderCircle, Pause, Play, Square } from "lucide-react";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Button } from "@/components/ui/button";
import { pauseTimer } from "../actions/pause-timer";
import { resumeTimer } from "../actions/resume-timer";
import { startTimer } from "../actions/start-timer";
import { stopTimer } from "../actions/stop-timer";
import type { TimerView } from "../types";
import { useTicketAction } from "./use-ticket-action";

type Props = {
  timer: TimerView | undefined;
  // POR QUÉ: sin target (no puede registrar ahí) no se ofrece Iniciar.
  target?: { ticketId: string; subtaskId: string | null };
  size?: "sm" | "lg";
  startLabel?: string;
  // Alt+I inicia, pausa o reanuda este contador; solo el contador grande del ticket lo toma.
  withShortcut?: boolean;
};

export function TimerButtons({
  timer,
  target,
  size = "lg",
  startLabel = "Iniciar",
  withShortcut = false,
}: Props) {
  const { run, isPending, error } = useTicketAction();
  useShortcuts(
    withShortcut
      ? {
          "ticket.timer": () => {
            if (isPending) return;
            if (!timer && target) run(() => startTimer(target));
            else if (timer?.status === "CORRIENDO")
              run(() => pauseTimer({ timerId: timer.timerId }));
            else if (timer?.status === "PAUSADO")
              run(() => resumeTimer({ timerId: timer.timerId }));
          },
        }
      : {},
  );
  const icon = (Icon: typeof Play) =>
    isPending ? (
      <LoaderCircle className="animate-spin" aria-hidden="true" />
    ) : (
      <Icon aria-hidden="true" />
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!timer && target && (
        <Button
          size={size}
          disabled={isPending}
          onClick={() => run(() => startTimer(target))}
        >
          {icon(Play)}
          {startLabel}
        </Button>
      )}
      {timer?.status === "CORRIENDO" && (
        <Button
          size={size}
          disabled={isPending}
          onClick={() => run(() => pauseTimer({ timerId: timer.timerId }))}
        >
          {icon(Pause)}
          Pausar
        </Button>
      )}
      {timer?.status === "PAUSADO" && (
        <Button
          size={size}
          disabled={isPending}
          onClick={() => run(() => resumeTimer({ timerId: timer.timerId }))}
        >
          {icon(Play)}
          Reanudar
        </Button>
      )}
      {timer && (
        <Button
          size={size}
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => stopTimer({ timerId: timer.timerId }))}
        >
          <Square aria-hidden="true" />
          Terminar
        </Button>
      )}
      {error && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
