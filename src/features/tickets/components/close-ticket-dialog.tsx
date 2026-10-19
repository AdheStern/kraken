// src/features/tickets/components/close-ticket-dialog.tsx
// Cierra un ticket resuelto y muestra lo que se descontó de las bolsas, lo que quedó sin bolsa y el redondeo
// perdonado (AGENTS.md §2.6 cuantización y descuento al cierre).
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMinutes } from "@/lib/format-minutes";
import type { ClosedTicket } from "@/server/tickets/close-ticket-hours";
import { closeTicket } from "../actions/close-ticket";
import { useTicketAction } from "./use-ticket-action";

export function CloseTicketDialog({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState<ClosedTicket | null>(null);
  const { run, isPending, error, refresh } = useTicketAction();
  const finish = () => {
    setOpen(false);
    refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) =>
        next ? setOpen(true) : closed ? finish() : setOpen(false)
      }
    >
      <DialogTrigger render={<Button size="sm" />}>Cerrar ticket</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {closed ? "Ticket cerrado" : "Cerrar el ticket"}
          </DialogTitle>
          <DialogDescription>
            {closed
              ? "Las horas ya se descontaron de las bolsas."
              : "Se descuentan sus horas de las bolsas en el orden de la jerarquía, con el mismo cálculo del consumo proyectado. Si hay que corregir algo, se puede reabrir."}
          </DialogDescription>
        </DialogHeader>
        {closed && (
          <dl className="grid gap-1 text-sm" aria-live="polite">
            <Fact
              label="Descontado"
              value={formatMinutes(closed.chargedMinutes)}
            />
            <Fact
              label="Sin bolsa (pendiente)"
              value={formatMinutes(closed.pendingMinutes)}
            />
            {closed.waivedMinutes > 0 && (
              <Fact
                label="Redondeo no cobrado"
                value={formatMinutes(closed.waivedMinutes)}
              />
            )}
          </dl>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          {closed ? (
            <Button onClick={finish}>Listo</Button>
          ) : (
            <Button
              disabled={isPending}
              onClick={() =>
                run(() => closeTicket({ ticketId }), setClosed, false)
              }
            >
              {isPending && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              Cerrar y descontar horas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
