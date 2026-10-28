// src/features/tickets/components/my-ticket-requests.tsx
// Lista de las solicitudes del usuario con el estado de su ticket, su encargado o el motivo del descarte
// (AGENTS.md §2.6 «Solicitudes de ticket»).
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Badge } from "@/components/ui/badge";
import type { MyTicketRequestView } from "../queries/list-my-ticket-requests";
import { STATUS_LABELS } from "../ticket-labels";
import { formatDateTime } from "./ticket-dates";

export function MyTicketRequests({
  requests,
}: {
  requests: MyTicketRequestView[];
}) {
  if (requests.length === 0)
    return (
      <KrakenEmpty title="Aún no pediste ningún ticket">
        Si tienes un problema, crea una solicitud y elige el área que debe
        atenderlo. Te avisaremos cuando la tomen y cuando se resuelva.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {requests.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                #{r.number}
              </span>
              <span className="font-medium">{r.title}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {r.areaCode} · pedida el {formatDateTime(r.createdAt)}
            </p>
            <RequestDetail request={r} />
          </div>
          <RequestBadge request={r} />
        </li>
      ))}
    </ul>
  );
}

function RequestDetail({ request: r }: { request: MyTicketRequestView }) {
  if (r.status === "DESCARTADA")
    return (
      <p className="mt-1 text-xs">
        Descartada el {formatDateTime(r.handledAt)}: {r.discardReason}
      </p>
    );
  if (!r.ticket)
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Espera que un coordinador del área la revise.
      </p>
    );
  return (
    <p className="mt-1 text-xs">
      Ticket #{r.ticket.number} ·{" "}
      {r.ticket.ownerName
        ? `a cargo de ${r.ticket.ownerName}`
        : "sin encargado todavía"}{" "}
      · actualizado el {formatDateTime(r.ticket.updatedAt)}
    </p>
  );
}

function RequestBadge({ request: r }: { request: MyTicketRequestView }) {
  if (r.status === "DESCARTADA")
    return <Badge variant="destructive">Descartada</Badge>;
  if (!r.ticket) return <Badge variant="outline">Pendiente</Badge>;
  const done = ["RESUELTO", "CERRADO"].includes(r.ticket.status);
  return (
    <Badge variant={done ? "secondary" : "default"}>
      {STATUS_LABELS[r.ticket.status]}
    </Badge>
  );
}
