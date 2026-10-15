// src/features/admin/components/test-mail-button.tsx
// Pone en la cola un correo de prueba para el administrador y le dice adónde llegará.
"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendTestMail } from "../actions/send-test-mail";
import { useAdminAction } from "./use-admin-action";

export function TestMailButton() {
  const { isPending, error, run } = useAdminAction();
  const [queuedTo, setQueuedTo] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={isPending}
        onClick={async () => {
          setQueuedTo(null);
          await run(async () => {
            const result = await sendTestMail();
            if (result.ok) setQueuedTo(result.data.to);
            return result;
          });
        }}
      >
        {isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Send aria-hidden="true" />
        )}
        Enviarme un correo de prueba
      </Button>
      {queuedTo && !error && (
        <output className="block max-w-72 text-right text-sm text-muted-foreground">
          En cola para {queuedTo}; sale en menos de un minuto si el worker está
          corriendo.
        </output>
      )}
      {error && (
        <p
          role="alert"
          className="max-w-72 text-right text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
