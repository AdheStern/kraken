// src/features/tickets/components/reopen-ticket-dialog.tsx
// Reabre un ticket cerrado con motivo: lo descontado queda firme y al volver a cerrarlo solo se cobra lo que falte
// (AGENTS.md §2.6, §8 CERRADO → EN_PROGRESO).
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reopenTicket } from "../actions/reopen-ticket";
import { useTicketAction } from "./use-ticket-action";

export function ReopenTicketDialog({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { run, isPending, error } = useTicketAction();

  async function confirm() {
    if (await run(() => reopenTicket({ ticketId, reason }))) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Reabrir
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reabrir el ticket</DialogTitle>
          <DialogDescription>
            Las horas ya descontadas se mantienen. Al volver a cerrarlo solo se
            descuenta el trabajo nuevo que pase de lo ya cobrado.
          </DialogDescription>
        </DialogHeader>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Motivo
          <Textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </Label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            onClick={confirm}
            disabled={isPending || reason.trim().length < 5}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Reabrir ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
