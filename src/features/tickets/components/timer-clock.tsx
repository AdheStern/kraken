// src/features/tickets/components/timer-clock.tsx
// Cifra del contador (h:mm:ss) que avanza cada segundo en el navegador a partir de la hora del servidor; la
// cifra no guarda nada: el tiempo vive en los eventos (AGENTS.md §2.6).
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  closedMs: number;
  runningSince: string | null;
  className?: string;
};

export function TimerClock({ closedMs, runningSince, className }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!runningSince) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [runningSince]);
  const running = runningSince
    ? Math.max(0, now - Date.parse(runningSince))
    : 0;
  return (
    // POR QUÉ: la cifra depende de la hora del navegador; el servidor solo da el punto de partida.
    <span
      suppressHydrationWarning
      className={cn("font-semibold tabular-nums tracking-[-0.02em]", className)}
    >
      {formatClock(closedMs + running)}
    </span>
  );
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}
