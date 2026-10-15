// src/features/admin/components/failed-mail-list.tsx
// Correos que no se pudieron enviar: para quién, asunto, cuántos intentos, el último error y reintentar.
"use client";

import { RotateCcw } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";
import { retryOutboxMessage } from "../actions/retry-outbox-message";
import type { MailStatus } from "../types";
import { useAdminAction } from "./use-admin-action";

export function FailedMailList({ failed }: Pick<MailStatus, "failed">) {
  const { isPending, error, run } = useAdminAction();
  if (failed.length === 0)
    return (
      <KrakenEmpty compact title="Ningún correo falló.">
        Si uno falla 10 veces, o el destinatario no existe, aparece aquí y te
        avisamos en la campana.
      </KrakenEmpty>
    );
  return (
    <div className="grid gap-2">
      <ul className="kr-surface divide-y divide-border/60 rounded-xl">
        {failed.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.subject}</p>
              <p className="truncate text-muted-foreground">
                Para {m.recipientEmail} · {m.attempts}{" "}
                {m.attempts === 1 ? "intento" : "intentos"}
              </p>
              {m.lastError && (
                <p className="mt-1 line-clamp-2 font-mono text-xs text-destructive">
                  {m.lastError}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => run(() => retryOutboxMessage({ id: m.id }))}
            >
              <RotateCcw aria-hidden="true" />
              Reintentar
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
