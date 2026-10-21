// src/features/inventory/components/pos-reservation-list.tsx
// Reservas de CV pendientes a las que el POS puede despachar el producto del carrito, con lo que falta entregar.
"use client";

import { cn } from "@/lib/utils";
import type { PendingReservation } from "../types";
import { formatQuantity } from "./inventory-labels";

export function PosReservationList({
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
