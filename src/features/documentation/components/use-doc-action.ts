// src/features/documentation/components/use-doc-action.ts
// Ejecuta una Server Action de la documentación: estado de espera, mensaje de error y refresco al terminar.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActionResult } from "@/lib/action-result";

export function useDocAction() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TRAMPA: refresh() seguido de push() deja la navegación sin efecto; con destino solo se navega.
  async function run<T>(
    action: () => Promise<ActionResult<T>>,
    navigateTo?: (data: T) => string,
  ): Promise<boolean> {
    setIsPending(true);
    setError(null);
    const result = await action();
    setIsPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    if (navigateTo) router.push(navigateTo(result.data));
    else router.refresh();
    return true;
  }

  return { isPending, error, setError, run };
}
