// src/features/tickets/components/ticket-actions.tsx
// Acciones del detalle según los permisos: mover el estado, asignar encargado, cerrar con descuento de horas
// y reabrir (AGENTS.md §8; el servidor vuelve a validar cada una).
"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeTicketStatus } from "../actions/change-ticket-status";
import { TRANSITION_LABELS } from "../ticket-labels";
import type { TicketDetail, WorkStatus } from "../types";
import { AssignOwnerDialog } from "./assign-owner-dialog";
import { CloseTicketDialog } from "./close-ticket-dialog";
import { ReopenTicketDialog } from "./reopen-ticket-dialog";
import { useTicketAction } from "./use-ticket-action";

type Props = Pick<TicketDetail, "ticket" | "permissions" | "engineers">;

export function TicketActions({ ticket, permissions, engineers }: Props) {
  const { run, isPending, error } = useTicketAction();
  const { transitions, canClose } = permissions;
  const isFinished =
    ticket.status === "CERRADO" || ticket.status === "CANCELADO";
  const move = (to: WorkStatus) =>
    run(() => changeTicketStatus({ ticketId: ticket.id, to }));
  if (transitions.length === 0 && !canClose) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {transitions
          .filter((to) => to !== "CANCELADO")
          .map((to, index) => (
            <Button
              key={to}
              size="sm"
              variant={index === 0 ? "default" : "outline"}
              disabled={isPending}
              onClick={() => move(to)}
            >
              {isPending && index === 0 && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              {TRANSITION_LABELS[to]}
            </Button>
          ))}
        {canClose && ticket.status === "RESUELTO" && (
          <CloseTicketDialog ticketId={ticket.id} />
        )}
        {canClose && ticket.status === "CERRADO" && (
          <ReopenTicketDialog ticketId={ticket.id} />
        )}
        {canClose && !isFinished && (
          <AssignOwnerDialog
            ticketId={ticket.id}
            ownerId={ticket.owner?.id ?? null}
            engineers={engineers}
          />
        )}
        {transitions.includes("CANCELADO") && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => move("CANCELADO")}
          >
            {TRANSITION_LABELS.CANCELADO}
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
