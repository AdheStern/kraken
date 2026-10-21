// src/features/inventory/components/pos-destination.tsx
// A dónde va la salida del POS: la línea de un CV con su reserva pendiente, un ticket abierto por número o uso
// interno con motivo (AGENTS.md §2.8).
"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { findDispatchTicket } from "../actions/find-dispatch-ticket";
import type { DispatchTicket, PendingReservation } from "../types";
import { formatQuantity } from "./inventory-labels";

export type PosDestination =
  | { kind: "CV"; reservationId: string | null }
  | { kind: "TICKET"; ticket: DispatchTicket | null }
  | { kind: "INTERNO"; reason: string };

const KINDS = [
  { kind: "CV", label: "Línea de CV" },
  { kind: "TICKET", label: "Ticket" },
  { kind: "INTERNO", label: "Uso interno" },
] as const;

type Props = {
  value: PosDestination;
  reservations: PendingReservation[];
  onChange: (value: PosDestination) => void;
};

export function PosDestinationPicker({ value, reservations, onChange }: Props) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-medium">Destino</legend>
      <div className="grid grid-cols-3 gap-2">
        {KINDS.map(({ kind, label }) => (
          <Button
            key={kind}
            type="button"
            variant={value.kind === kind ? "default" : "outline"}
            className="h-12"
            aria-pressed={value.kind === kind}
            onClick={() => onChange(empty(kind))}
          >
            {label}
          </Button>
        ))}
      </div>
      {value.kind === "CV" && (
        <ReservationList
          reservations={reservations}
          selected={value.reservationId}
          onSelect={(id) => onChange({ kind: "CV", reservationId: id })}
        />
      )}
      {value.kind === "TICKET" && (
        <TicketSearch
          ticket={value.ticket}
          onFound={(ticket) => onChange({ kind: "TICKET", ticket })}
        />
      )}
      {value.kind === "INTERNO" && (
        <Textarea
          value={value.reason}
          placeholder="Para qué es (p. ej. laboratorio, demo a un cliente)"
          aria-label="Motivo del uso interno"
          className="min-h-20 text-base"
          onChange={(e) =>
            onChange({ kind: "INTERNO", reason: e.target.value })
          }
        />
      )}
    </fieldset>
  );
}

function empty(kind: PosDestination["kind"]): PosDestination {
  if (kind === "CV") return { kind, reservationId: null };
  if (kind === "TICKET") return { kind, ticket: null };
  return { kind, reason: "" };
}

function ReservationList({
  reservations,
  selected,
  onSelect,
}: {
  reservations: PendingReservation[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  if (reservations.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No hay reservas de CV pendientes para estos productos en este almacén.
      </p>
    );
  return (
    <ul className="grid gap-2">
      {reservations.map((r) => (
        <li key={r.reservationId}>
          <button
            type="button"
            aria-pressed={selected === r.reservationId}
            onClick={() => onSelect(r.reservationId)}
            className={cn(
              "kr-surface grid min-h-12 w-full gap-0.5 rounded-xl px-4 py-2 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected === r.reservationId && "ring-2 ring-primary",
            )}
          >
            <span className="font-medium tabular-nums">
              {r.cvLabel} · {r.customerName}
            </span>
            <span className="text-sm text-muted-foreground">
              {r.lineDescription} · faltan entregar{" "}
              {formatQuantity(r.pendingQuantity)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TicketSearch({
  ticket,
  onFound,
}: {
  ticket: DispatchTicket | null;
  onFound: (ticket: DispatchTicket | null) => void;
}) {
  const [number, setNumber] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function search() {
    setIsPending(true);
    setError(null);
    const result = await findDispatchTicket(number);
    setIsPending(false);
    if (!result.ok) setError(result.error.message);
    onFound(result.ok ? result.data : null);
  }
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input
          value={number}
          inputMode="numeric"
          placeholder="N.º de ticket"
          aria-label="Número del ticket"
          className="h-12 text-base"
          onChange={(e) => setNumber(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            search();
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-12"
          onClick={search}
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Search aria-hidden="true" />
          )}
          Buscar
        </Button>
      </div>
      {ticket && (
        <p className="text-sm">
          <span className="font-medium tabular-nums">
            Ticket #{ticket.number}
          </span>{" "}
          · {ticket.title} · {ticket.customerName}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
