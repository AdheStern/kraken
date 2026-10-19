// src/features/tickets/components/ticket-card.tsx
// Tarjeta de un ticket en el tablero: número, prioridad, título, cliente y áreas, y su encargado; toda la
// tarjeta abre el detalle (AGENTS.md §5 "kanban").
import Link from "next/link";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { Badge } from "@/components/ui/badge";
import { SlaBadge } from "@/features/sla/components/sla-badge";
import { cn } from "@/lib/utils";
import {
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../ticket-labels";
import type { TicketCard as TicketCardData } from "../types";

type Props = { ticket: TicketCardData; showStatus?: boolean };

export function TicketCard({ ticket, showStatus = false }: Props) {
  return (
    <li className="kr-solid kr-lift relative flex flex-col gap-2 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/tickets/${ticket.id}`}
          className="text-sm font-semibold tabular-nums after:absolute after:inset-0 after:rounded-xl hover:underline"
        >
          #{ticket.number}
        </Link>
        <Badge
          variant="secondary"
          className={PRIORITY_CLASSES[ticket.priority]}
        >
          {PRIORITY_LABELS[ticket.priority]}
        </Badge>
      </div>
      <p className="line-clamp-2 text-sm font-medium">{ticket.title}</p>
      <p className="truncate text-xs text-muted-foreground">
        {ticket.customerName}
        {ticket.areaCodes.length > 0 && ` · ${ticket.areaCodes.join(" / ")}`}
      </p>
      {ticket.sla && !showStatus && <SlaBadge sla={ticket.sla} />}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            !ticket.owner && "text-muted-foreground",
          )}
        >
          {ticket.owner && (
            <PersonAvatar
              name={ticket.owner.name}
              image={ticket.owner.image}
              className="size-5 text-[10px]"
            />
          )}
          <span className="truncate">
            {ticket.owner?.name ?? "Sin encargado"}
          </span>
        </span>
        {showStatus && (
          <span className="shrink-0 text-muted-foreground">
            {STATUS_LABELS[ticket.status]}
          </span>
        )}
      </div>
    </li>
  );
}
