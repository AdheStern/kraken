// src/features/admin/components/use-admin-action.ts
// Ejecuta una Server Action de la administración: estado de espera, mensaje de error y refresco al terminar.
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActionResult } from "@/lib/action-result";

export function useAdminAction() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(
    action: () => Promise<ActionResult<T>>,
  ): Promise<boolean> {
    setIsPending(true);
    setError(null);
    const result = await action();
    setIsPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    router.refresh();
    return true;
  }

  return { isPending, error, setError, run };
}
