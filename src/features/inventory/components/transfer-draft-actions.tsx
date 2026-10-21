// src/features/inventory/components/transfer-draft-actions.tsx
// Acciones de un traspaso en borrador: enviarlo (el stock pasa a tránsito) o cancelarlo.
"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { cancelTransfer } from "../actions/cancel-transfer";
import { sendTransfer } from "../actions/send-transfer";

export function TransferDraftActions({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"send" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    kind: "send" | "cancel",
    action: () => Promise<ActionResult<null>>,
  ) {
    setPending(kind);
    setError(null);
    const result = await action();
    setPending(null);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={pending !== null}
          onClick={() => run("cancel", () => cancelTransfer({ transferId }))}
        >
          {pending === "cancel" && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Cancelar
        </Button>
        <Button
          disabled={pending !== null}
          onClick={() => run("send", () => sendTransfer({ transferId }))}
        >
          {pending === "send" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Enviar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
