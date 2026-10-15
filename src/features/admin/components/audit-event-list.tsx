// src/features/admin/components/audit-event-list.tsx
// Eventos de auditoría: quién, qué hizo y sobre qué, cuándo; al abrir uno, lo que cambió (ADR-14).
import { ChevronRight } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { toAuditDiff } from "../audit-diff";
import { auditActionLabel, auditEntityLabel } from "../audit-labels";
import type { AuditEventView } from "../types";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

type Props = { events: AuditEventView[]; isFiltered: boolean };

export function AuditEventList({ events, isFiltered }: Props) {
  if (events.length === 0)
    return isFiltered ? (
      <KrakenEmpty compact mood="curious" title="Nada con esos filtros.">
        Amplía las fechas o elige «Todo» en qué cambió.
      </KrakenEmpty>
    ) : (
      <KrakenEmpty compact title="Todavía no hay cambios registrados.">
        Cada aprobación, ajuste o cambio de la administración queda aquí con
        quién lo hizo y cuándo.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {events.map((e) => (
        <li key={e.id}>
          <details className="group px-4 py-3">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
              <ChevronRight
                className="size-4 self-center text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
                aria-hidden="true"
              />
              <span className="font-medium">{e.actor ?? "El sistema"}</span>
              <span>{auditActionLabel(e.action)}</span>
              <span className="text-muted-foreground">
                {auditEntityLabel(e.entity)}
              </span>
              {e.subject && (
                <span className="min-w-0 truncate font-medium">
                  {e.subject}
                </span>
              )}
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {dateTime.format(new Date(e.at))}
              </span>
            </summary>
            <AuditEventDetail event={e} />
          </details>
        </li>
      ))}
    </ul>
  );
}

function AuditEventDetail({ event }: { event: AuditEventView }) {
  const rows = toAuditDiff(event.before, event.after);
  return (
    <div className="mt-3 grid gap-2 pl-6 text-sm">
      {rows.length > 0 ? (
        <table className="w-full table-fixed text-left">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="w-1/4 pb-1 font-medium">Campo</th>
              <th className="pb-1 font-medium">Antes</th>
              <th className="pb-1 font-medium">Después</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {rows.map((r) => (
              <tr key={r.field}>
                <td className="py-0.5 pr-2 font-mono text-xs">{r.field}</td>
                <td className="py-0.5 pr-2 break-words text-muted-foreground">
                  {r.before}
                </td>
                <td className="py-0.5 break-words">{r.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted-foreground">Sin datos de antes y después.</p>
      )}
      <p className="font-mono text-xs text-muted-foreground">
        {event.entity} · {event.entityId}
        {event.ip && ` · desde ${event.ip}`}
      </p>
    </div>
  );
}
