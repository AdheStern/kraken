// src/features/tickets/components/ticket-timer.tsx
// Contador grande del detalle: un solo botón primario según el estado (iniciar, pausar, reanudar) y terminar
// aparte; en el móvil queda fijo abajo (AGENTS.md §5 "Contador grande", §8 contador).
"use client";

import { LoaderCircle, Pause, Play, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/ui/option-select";
import { pauseTimer } from "../actions/pause-timer";
import { resumeTimer } from "../actions/resume-timer";
import { startTimer } from "../actions/start-timer";
import { stopTimer } from "../actions/stop-timer";
import type { TicketTime } from "../types";
import { TimerClock } from "./timer-clock";
import { useTicketAction } from "./use-ticket-action";

type Props = { ticketId: string; time: TicketTime };

export function TicketTimer({ ticketId, time }: Props) {
  const [timer] = time.timers;
  const [target, setTarget] = useState<string>(time.targets[0]?.id ?? "ticket");
  const { run, isPending, error } = useTicketAction();
  if (!timer && time.targets.length === 0) return null;
  const options = time.targets.map((t) => ({
    id: t.id ?? "ticket",
    label: t.label,
  }));
  const icon = (Icon: typeof Play) =>
    isPending ? (
      <LoaderCircle className="animate-spin" aria-hidden="true" />
    ) : (
      <Icon aria-hidden="true" />
    );

  return (
    <section
      aria-label="Contador"
      className="kr-solid sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl p-4 sm:static sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <TimerClock
          closedMs={timer?.closedMs ?? 0}
          runningSince={timer?.runningSince ?? null}
          className="block text-4xl"
        />
        <p
          className="truncate text-xs text-muted-foreground"
          aria-live="polite"
        >
          {timer
            ? `${timer.status === "CORRIENDO" ? "Corriendo" : "En pausa"} · ${timer.subtaskTitle ?? "en el ticket"}`
            : "Sin contador. El tiempo se guarda con la hora del servidor; cerrar la pestaña no lo pierde."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!timer && options.length > 1 && (
          <OptionSelect
            aria-label="Dónde registrar"
            className="h-9 w-56"
            value={target}
            options={options}
            onValueChange={(v) => v && setTarget(v)}
          />
        )}
        {!timer && (
          <Button
            size="lg"
            disabled={isPending}
            onClick={() =>
              run(() =>
                startTimer({
                  ticketId,
                  subtaskId: target === "ticket" ? null : target,
                }),
              )
            }
          >
            {icon(Play)}
            Iniciar
          </Button>
        )}
        {timer?.status === "CORRIENDO" && (
          <Button
            size="lg"
            disabled={isPending}
            onClick={() => run(() => pauseTimer({ timerId: timer.timerId }))}
          >
            {icon(Pause)}
            Pausar
          </Button>
        )}
        {timer?.status === "PAUSADO" && (
          <Button
            size="lg"
            disabled={isPending}
            onClick={() => run(() => resumeTimer({ timerId: timer.timerId }))}
          >
            {icon(Play)}
            Reanudar
          </Button>
        )}
        {timer && (
          <Button
            size="lg"
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => stopTimer({ timerId: timer.timerId }))}
          >
            <Square aria-hidden="true" />
            Terminar
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:basis-full"
        >
          {error}
        </p>
      )}
    </section>
  );
}
