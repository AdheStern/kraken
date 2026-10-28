// src/features/tickets/components/ticket-request-inbox.tsx
// Solicitudes pendientes de las áreas que el usuario atiende, con el alta del ticket prellenada y el descarte
// (AGENTS.md §2.6 «Solicitudes de ticket»).
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { TicketFormOptions } from "../queries/get-ticket-form-options";
import type { PendingTicketRequestView } from "../queries/list-pending-ticket-requests";
import { DiscardTicketRequestDialog } from "./discard-ticket-request-dialog";
import { NewTicketDialog } from "./new-ticket-dialog";
import { formatDateTime } from "./ticket-dates";

type Props = {
  requests: PendingTicketRequestView[];
  options: TicketFormOptions;
};

export function TicketRequestInbox({ requests, options }: Props) {
  if (requests.length === 0)
    return (
      <KrakenEmpty title="No hay solicitudes pendientes en tus áreas">
        Cuando alguien pida un ticket a un área que atiendes, aparecerá aquí y
        te llegará un aviso.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {requests.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">
                  #{r.number}
                </span>
                <span className="font-medium">{r.title}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {r.areaCode} · {r.requesterName} · {formatDateTime(r.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <DiscardTicketRequestDialog requestId={r.id} number={r.number} />
              <NewTicketDialog
                options={options}
                triggerLabel="Crear ticket"
                initialValues={{
                  title: r.title,
                  description: r.description,
                  areaIds: [r.areaId],
                  cityId: r.requesterCityId ?? "",
                  requestId: r.id,
                }}
              />
            </div>
          </div>
          <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px]">
            {r.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
