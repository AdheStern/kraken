// src/features/tickets/components/pending-hours-list.tsx
// Horas del ticket que no alcanzaron bolsa al cerrar y su aplicación a una bolsa del cliente, ponderadas con su
// modalidad (AGENTS.md §2.6 paso 5, applyPendingHours).
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/ui/option-select";
import type { BagSummary } from "@/features/hours/types";
import { formatMinutes } from "@/lib/format-minutes";
import { applyPendingHours } from "../actions/apply-pending-hours";
import type { PendingView } from "../types";
import { useTicketAction } from "./use-ticket-action";

type Props = { pending: PendingView[]; bags: BagSummary[]; canApply: boolean };

export function PendingHoursList({ pending, bags, canApply }: Props) {
  const [bagByPending, setBagByPending] = useState<
    Record<string, string | null>
  >({});
  const { run, isPending, error } = useTicketAction();
  if (pending.length === 0) return null;
  const options = bags.map((b) => ({
    id: b.id,
    label: `${b.cvLabel} · saldo ${formatMinutes(b.balanceMinutes)}`,
  }));

  return (
    <section
      aria-labelledby="pendiente-sin-bolsa"
      className="flex flex-col gap-2"
    >
      <h3 id="pendiente-sin-bolsa" className="text-sm font-semibold">
        Horas sin bolsa
      </h3>
      <ul className="kr-solid divide-y divide-border/60 rounded-xl">
        {pending.map((p) => {
          const bagId = bagByPending[p.id] ?? null;
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="min-w-0 flex-1 tabular-nums">
                {formatMinutes(p.insideMinutes)} dentro y{" "}
                {formatMinutes(p.outsideMinutes)} fuera de horario
              </span>
              {p.status === "APLICADA" ? (
                <span className="text-xs text-muted-foreground">
                  Aplicadas a una bolsa
                </span>
              ) : canApply && options.length > 0 ? (
                <span className="flex flex-wrap gap-2">
                  <OptionSelect
                    aria-label="Bolsa a la que se aplican"
                    className="h-8 w-64"
                    value={bagId}
                    placeholder="Elige la bolsa…"
                    options={options}
                    onValueChange={(v) =>
                      setBagByPending({ ...bagByPending, [p.id]: v })
                    }
                  />
                  <Button
                    size="sm"
                    disabled={!bagId || isPending}
                    onClick={() =>
                      bagId &&
                      run(() => applyPendingHours({ pendingId: p.id, bagId }))
                    }
                  >
                    {isPending && (
                      <LoaderCircle
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    Aplicar
                  </Button>
                </span>
              ) : (
                <span className="text-xs text-warning">
                  Pendientes: asocia un CV con horas para aplicarlas.
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </section>
  );
}
