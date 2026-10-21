// src/features/inventory/components/pos-destination.tsx
// A dónde va la salida del POS: la línea de un CV con su reserva pendiente, un ticket abierto por número o uso
// interno con motivo (AGENTS.md §2.8).
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DispatchTicket, PendingReservation } from "../types";
import { PosReservationList } from "./pos-reservation-list";
import { PosTicketSearch } from "./pos-ticket-search";

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
        <PosReservationList
          reservations={reservations}
          selected={value.reservationId}
          onSelect={(id) => onChange({ kind: "CV", reservationId: id })}
        />
      )}
      {value.kind === "TICKET" && (
        <PosTicketSearch
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
