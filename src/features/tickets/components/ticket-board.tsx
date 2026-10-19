// src/features/tickets/components/ticket-board.tsx
// Tablero de tickets por estado (AGENTS.md §5 "kanban"): columnas con su conteo; en el móvil se apilan.
// POR QUÉ: el estado se cambia desde el detalle, con sus reglas, y no arrastrando tarjetas (KISS).
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { BOARD_COLUMNS } from "../ticket-labels";
import type { TicketCard as TicketCardData } from "../types";
import { TicketCard } from "./ticket-card";

type Props = { tickets: TicketCardData[]; isFiltered: boolean };

export function TicketBoard({ tickets, isFiltered }: Props) {
  if (tickets.length === 0)
    return (
      <KrakenEmpty
        mood={isFiltered ? "curious" : "idle"}
        title={
          isFiltered
            ? "Ningún ticket con estos filtros"
            : "No hay tickets todavía"
        }
      >
        {isFiltered
          ? "Quita un filtro para ver más tickets."
          : "Cuando un cliente pida soporte, créalo con «Nuevo ticket» y asígnale un encargado."}
      </KrakenEmpty>
    );
  return (
    <div className="grid gap-4 md:grid-flow-col md:auto-cols-[minmax(13.5rem,1fr)] md:overflow-x-auto md:pb-2">
      {BOARD_COLUMNS.map((column) => {
        const cards = tickets.filter((t) => column.statuses.includes(t.status));
        const headingId = `columna-${column.key}`;
        return (
          <section
            key={column.key}
            aria-labelledby={headingId}
            className="kr-surface flex min-w-0 flex-col gap-3 rounded-xl p-3"
          >
            <h2
              id={headingId}
              className="flex items-baseline justify-between gap-2 px-1 text-sm font-semibold"
            >
              {column.title}
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {cards.length}
              </span>
            </h2>
            {cards.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {cards.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    showStatus={column.statuses.length > 1}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-1 pb-1 text-xs text-muted-foreground">
                Sin tickets.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
