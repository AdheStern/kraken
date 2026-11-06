// src/features/tickets/components/customer-ticket-list.tsx
// Tickets de la empresa en el portal de clientes: número, título, estado, encargado y horas descontadas (§2.11).
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import type { CustomerTicketRow } from "../customer-portal-types";
import {
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../ticket-labels";
import { formatDateTime } from "./ticket-dates";

export function CustomerTicketList({
  tickets,
}: {
  tickets: CustomerTicketRow[];
}) {
  if (tickets.length === 0)
    return (
      <p className="kr-surface rounded-xl px-4 py-6 text-sm text-muted-foreground">
        Tu empresa todavía no tiene tickets. Cuando DIMA abra uno para ustedes,
        aparecerá aquí con su avance.
      </p>
    );
  return (
    <ul
      data-tour="cliente-tickets"
      className="kr-solid divide-y divide-border/60 rounded-xl"
    >
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            href={`/cliente/tickets/${t.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-muted/40"
          >
            <span className="font-medium tabular-nums">#{t.number}</span>
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_CLASSES[t.priority]}`}
            >
              {PRIORITY_LABELS[t.priority]}
            </span>
            <span className="w-28 text-xs text-muted-foreground">
              {STATUS_LABELS[t.status]}
            </span>
            <span className="w-full text-xs text-muted-foreground sm:w-auto">
              {t.ownerName ?? "Sin encargado"} · {formatDateTime(t.createdAt)}
              {t.closedAt &&
                ` · ${formatMinutes(t.chargedMinutes)} descontadas`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
