// src/features/tickets/components/auto-refresh.tsx
// Vuelve a pedir la página al servidor cada cierto tiempo mientras la pestaña está a la vista, para ver los
// contadores que otras personas inician, pausan o terminan (AGENTS.md §2.6).
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// LIMITACIÓN: sin WebSocket (KISS); un cambio de otra persona tarda hasta 20 s en verse. La cifra de un contador
// ya visible avanza cada segundo en el navegador.
const REFRESH_MS = 20_000;

export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
