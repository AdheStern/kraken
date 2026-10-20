// src/features/tickets/components/ticket-card-menu.tsx
// Menú de la tarjeta del tablero para mover el ticket sin abrirlo; solo ofrece las transiciones permitidas al
// usuario (AGENTS.md §8). Cerrar y reabrir mueven horas y se hacen desde el detalle.
"use client";

import { EllipsisVertical, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { changeTicketStatus } from "../actions/change-ticket-status";
import { TRANSITION_LABELS } from "../ticket-labels";
import type { WorkStatus } from "../types";
import { useTicketAction } from "./use-ticket-action";

type Props = { ticketId: string; number: number; transitions: WorkStatus[] };

export function TicketCardMenu({ ticketId, number, transitions }: Props) {
  const { run, isPending, error } = useTicketAction();
  if (transitions.length === 0) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative z-10 -mr-1.5"
              disabled={isPending}
            />
          }
        >
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <EllipsisVertical aria-hidden="true" />
          )}
          <span className="sr-only">
            Cambiar el estado del ticket #{number}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {transitions.map((to) => (
            <DropdownMenuItem
              key={to}
              variant={to === "CANCELADO" ? "destructive" : "default"}
              onClick={() => run(() => changeTicketStatus({ ticketId, to }))}
            >
              {TRANSITION_LABELS[to]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p
          role="alert"
          className="relative z-10 basis-full text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </>
  );
}
