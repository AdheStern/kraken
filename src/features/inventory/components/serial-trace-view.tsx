// src/features/inventory/components/serial-trace-view.tsx
// Recorrido de un serial como línea de tiempo por unidad (ingreso, traspasos, salidas, devoluciones) y las ventas
// que lo nombran con su vigencia (AGENTS.md §2.8, decisión 2026-11-05). Sin costos.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { SerialTrace, SerialTraceEvent } from "../serial-trace-types";
import { MOVEMENT_KIND_LABELS } from "./inventory-labels";

const STATUS_LABELS: Record<SerialTrace["units"][number]["status"], string> = {
  EN_STOCK: "En stock",
  EN_TRANSITO: "En tránsito",
  RESERVADO: "Reservado",
  DESPACHADO: "Despachado",
  BAJA: "De baja",
};

const DATE = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function SerialTraceView({ trace }: { trace: SerialTrace }) {
  return (
    <div className="flex flex-col gap-5">
      {trace.units.map((unit) => (
        <section
          key={unit.id}
          className="kr-solid flex flex-col gap-4 rounded-xl p-4"
        >
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-mono text-base font-semibold">{unit.serial}</h2>
            <span className="text-sm">
              {unit.code} · {unit.description}
            </span>
            <Badge variant="secondary" className="ml-auto">
              {STATUS_LABELS[unit.status]}
              {unit.warehouse ? ` · ${unit.warehouse}` : ""}
            </Badge>
          </header>
          {unit.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ves sus movimientos: el kardex es de Almacén, Administración y
              gerencia.
            </p>
          ) : (
            <ol className="flex flex-col gap-3 border-l pl-4">
              {unit.events.map((event) => (
                <TraceEvent key={event.id} event={event} />
              ))}
            </ol>
          )}
        </section>
      ))}
      {trace.sales.length > 0 && (
        <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
          <h2 className="text-sm font-medium">Vendido en</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {trace.sales.map((sale) => (
              <li key={`${sale.cvId}-${sale.cvLabel}`}>
                <Link
                  href={`/cv/${sale.cvId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {sale.cvLabel}
                </Link>{" "}
                · {sale.customerName} · {sale.description}
                {sale.coverageEnd && (
                  <span className="text-muted-foreground">
                    {" "}
                    · vigencia {sale.coverageStart ?? "…"} a {sale.coverageEnd}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TraceEvent({ event }: { event: SerialTraceEvent }) {
  const { document } = event;
  return (
    <li className="relative text-sm">
      <span
        aria-hidden="true"
        className={`absolute top-1.5 -left-[1.3rem] size-2 rounded-full ${event.isIn ? "bg-primary" : "bg-muted-foreground"}`}
      />
      <p>
        <span className="font-medium">
          {MOVEMENT_KIND_LABELS[event.kind]} N.º {event.number}
        </span>{" "}
        · {event.isIn ? "entra a" : "sale de"} {event.warehouse}
        {document && " · "}
        {document && "href" in document ? (
          <Link
            href={document.href}
            className="underline-offset-4 hover:underline"
          >
            {document.label}
          </Link>
        ) : (
          document?.label
        )}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {DATE.format(new Date(event.createdAt))}
      </p>
    </li>
  );
}
