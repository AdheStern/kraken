// src/features/tickets/components/customer-ticket-view.tsx
// Detalle de un ticket en el portal de clientes: estado, encargado, SLA, horas descontadas y comentarios
// públicos, adjuntos y, si su empresa lo permite, su respuesta (AGENTS.md §2.11). Sin datos internos.
import { Download } from "lucide-react";
import { formatMinutes } from "@/lib/format-minutes";
import type { CustomerTicketDetail } from "../customer-portal-types";
import { PRIORITY_LABELS, STATUS_LABELS } from "../ticket-labels";
import { CustomerTicketReply } from "./customer-ticket-reply";
import { formatDateTime } from "./ticket-dates";

const SLA_KIND = {
  PRIMERA_RESPUESTA: "Primera respuesta",
  RESOLUCION: "Resolución",
};
const SLA_STATUS = {
  EN_CURSO: "En curso",
  PAUSADO: "En pausa (esperando al cliente)",
  CUMPLIDO: "Cumplido",
  INCUMPLIDO: "Fuera de plazo",
};

export function CustomerTicketView({
  ticket,
}: {
  ticket: CustomerTicketDetail;
}) {
  const facts: [string, string][] = [
    ["Estado", STATUS_LABELS[ticket.status]],
    ["Prioridad", PRIORITY_LABELS[ticket.priority]],
    ["Encargado", ticket.ownerName ?? "Sin asignar todavía"],
    ["Abierto", formatDateTime(ticket.createdAt)],
    ["Resuelto", ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : "—"],
    [
      "Horas descontadas",
      ticket.closedAt ? formatMinutes(ticket.chargedMinutes) : "Al cerrarse",
    ],
    ...ticket.sla.map((s): [string, string] => [
      `SLA · ${SLA_KIND[s.kind]}`,
      SLA_STATUS[s.status],
    ]),
  ];
  return (
    <div className="grid gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] break-words">
          #{ticket.number} {ticket.title}
        </h1>
        <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
          {ticket.description}
        </p>
      </header>
      <dl className="kr-surface grid gap-x-6 gap-y-3 rounded-xl p-5 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <section className="grid gap-3" aria-labelledby="comentarios">
        <h2 id="comentarios" className="text-sm font-medium">
          Comentarios
        </h2>
        {ticket.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay comentarios. DIMA publicará aquí el avance.
          </p>
        ) : (
          <ul className="grid gap-2">
            {ticket.comments.map((c) => (
              <li key={c.id} className="kr-solid rounded-xl px-4 py-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {c.authorName} · {formatDateTime(c.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-line">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
        {ticket.canComment && (
          <CustomerTicketReply
            ticketId={ticket.id}
            filesEnabled={ticket.filesEnabled}
          />
        )}
      </section>
      {ticket.attachments.length > 0 && (
        <section className="grid gap-3" aria-labelledby="adjuntos">
          <h2 id="adjuntos" className="text-sm font-medium">
            Adjuntos
          </h2>
          <ul className="kr-solid divide-y divide-border/60 rounded-xl">
            {ticket.attachments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(a.createdAt)}
                </span>
                <a
                  href={`/api/tickets/attachments/${a.id}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Descargar
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
