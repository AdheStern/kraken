// src/features/tickets/components/use-ticket-action.ts
// Estado común de una acción del detalle: pendiente, error del servidor y refresco al terminar bien.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActionResult } from "@/lib/action-result";

export function useTicketAction() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(
    action: () => Promise<ActionResult<T>>,
    onDone?: (data: T) => void,
    // POR QUÉ: un resumen que se muestra tras la acción se perdería si el refresco desmonta el diálogo.
    refresh = true,
  ): Promise<boolean> {
    setIsPending(true);
    setError(null);
    const result = await action();
    setIsPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    onDone?.(result.data);
    if (refresh) router.refresh();
    return true;
  }

  return { run, isPending, error, refresh: router.refresh };
}
