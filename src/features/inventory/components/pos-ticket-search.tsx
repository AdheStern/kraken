// src/features/inventory/components/pos-ticket-search.tsx
// Búsqueda por número del ticket abierto al que el POS despacha; muestra solo número, título y cliente.
"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findDispatchTicket } from "../actions/find-dispatch-ticket";
import type { DispatchTicket } from "../types";

export function PosTicketSearch({
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
