// src/features/tickets/components/ticket-header.tsx
// Cabecera densa del detalle: número, estado, prioridad, título, cliente, áreas, encargado y fechas clave
// (AGENTS.md §5 "Detalle del ticket").
import type { ReactNode } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { Badge } from "@/components/ui/badge";
import {
  KIND_LABELS,
  MODALITY_LABELS,
  PRIORITY_CLASSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../ticket-labels";
import type { TicketHeader as TicketHeaderData } from "../types";
import { formatDateTime } from "./ticket-dates";

type Props = { ticket: TicketHeaderData; actions?: ReactNode };

export function TicketHeader({ ticket, actions }: Props) {
  const facts: [string, ReactNode][] = [
    ["Cliente", ticket.customerName],
    ["Ciudad", ticket.cityName],
    ["Áreas", ticket.areas.map((a) => a.code).join(" / ")],
    [
      "Tipo",
      ticket.projectName
        ? `${KIND_LABELS.PROYECTO} · ${ticket.projectName}`
        : KIND_LABELS[ticket.kind],
    ],
    ["SLA", MODALITY_LABELS[ticket.slaModality]],
    ["Creado", formatDateTime(ticket.createdAt)],
    [
      "Primera respuesta",
      ticket.firstResponseAt
        ? formatDateTime(ticket.firstResponseAt)
        : "Pendiente",
    ],
    [
      ticket.closedAt ? "Cerrado" : "Resuelto",
      formatDateTime(ticket.closedAt ?? ticket.resolvedAt),
    ],
  ];
  return (
    <section className="kr-solid flex flex-col gap-4 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold tabular-nums">#{ticket.number}</span>
            <Badge variant="outline">{STATUS_LABELS[ticket.status]}</Badge>
            <Badge
              variant="secondary"
              className={PRIORITY_CLASSES[ticket.priority]}
            >
              Prioridad {PRIORITY_LABELS[ticket.priority].toLowerCase()}
            </Badge>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
            {ticket.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {ticket.owner ? (
            <>
              <PersonAvatar
                name={ticket.owner.name}
                image={ticket.owner.image}
              />
              <span>
                <span className="block text-xs text-muted-foreground">
                  Encargado
                </span>
                {ticket.owner.name}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Sin encargado</span>
          )}
        </div>
      </div>
      <p className="whitespace-pre-line text-sm text-muted-foreground">
        {ticket.description}
      </p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {actions}
    </section>
  );
}
