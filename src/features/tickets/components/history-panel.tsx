// src/features/tickets/components/history-panel.tsx
// Historial de estados del ticket, del más reciente al más antiguo (AGENTS.md §8; base del reloj del SLA).
import { STATUS_LABELS } from "../ticket-labels";
import type { StatusEventView } from "../types";
import { formatDateTime } from "./ticket-dates";

export function HistoryPanel({ history }: { history: StatusEventView[] }) {
  return (
    <ol className="kr-solid divide-y divide-border/60 rounded-xl">
      {history.map((event) => (
        <li
          key={event.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
        >
          <span>
            {event.from ? (
              <>
                {STATUS_LABELS[event.from]} →{" "}
                <span className="font-medium">{STATUS_LABELS[event.to]}</span>
              </>
            ) : (
              <span className="font-medium">Creado</span>
            )}
            <span className="text-muted-foreground"> · {event.actorName}</span>
          </span>
          <time
            dateTime={event.occurredAt}
            className="text-xs tabular-nums text-muted-foreground"
          >
            {formatDateTime(event.occurredAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
