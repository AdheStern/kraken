// src/features/tickets/components/time-entries-panel.tsx
// Registros de tiempo del ticket de todos los participantes, con su origen y marca de tardío, y el formulario
// manual (AGENTS.md §2.6 registro de tiempo; el tiempo de personas distintas se suma).
"use client";

import { Trash2 } from "lucide-react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/format-minutes";
import { deleteTimeEntry } from "../actions/delete-time-entry";
import type { TicketTime } from "../types";
import { ManualEntryForm } from "./manual-entry-form";
import { formatDateTime } from "./ticket-dates";
import { useTicketAction } from "./use-ticket-action";

type Props = { ticketId: string; time: TicketTime };

export function TimeEntriesPanel({ ticketId, time }: Props) {
  const { run, isPending, error } = useTicketAction();
  const total = time.entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0);
  return (
    <div className="flex flex-col gap-4">
      {time.targets.length > 0 && (
        <ManualEntryForm ticketId={ticketId} targets={time.targets} />
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {time.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin registros. Usa el contador mientras trabajas o carga un tramo
          manual con su inicio y fin.
        </p>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-semibold tabular-nums">
              {formatMinutes(total)}
            </span>{" "}
            <span className="text-muted-foreground">
              reales registrados (antes de ponderar por horario)
            </span>
          </p>
          <ul className="kr-solid divide-y divide-border/60 rounded-xl">
            {time.entries.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <PersonAvatar
                  name={e.person.name}
                  image={e.person.image}
                  className="size-6 text-[10px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{e.person.name}</span>
                  {e.subtaskTitle && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {e.subtaskTitle}
                    </span>
                  )}
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    {formatDateTime(e.startedAt)} →{" "}
                    {e.endedAt ? formatDateTime(e.endedAt) : "en curso"}
                  </span>
                </span>
                {e.isLate && (
                  <Badge
                    variant="secondary"
                    className="bg-warning/15 text-warning"
                  >
                    Tardío
                  </Badge>
                )}
                <Badge variant="outline">
                  {e.source === "CONTADOR" ? "Contador" : "Manual"}
                </Badge>
                <span className="w-20 text-right font-medium tabular-nums">
                  {e.minutes === null ? "—" : formatMinutes(e.minutes)}
                </span>
                {e.canDelete && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Borrar registro"
                    disabled={isPending}
                    onClick={() =>
                      run(() => deleteTimeEntry({ entryId: e.id }))
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
