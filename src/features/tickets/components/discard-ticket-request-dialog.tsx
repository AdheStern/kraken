// src/features/tickets/components/discard-ticket-request-dialog.tsx
// Descarte de una solicitud de ticket con motivo; el solicitante lo recibe en su aviso (AGENTS.md §2.6, §8).
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { discardTicketRequest } from "../actions/discard-ticket-request";

type Props = { requestId: string; number: number };

export function DiscardTicketRequestDialog({ requestId, number }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    setIsPending(true);
    setError(null);
    const result = await discardTicketRequest({ requestId, reason });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
          />
        }
      >
        Descartar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descartar la solicitud #{number}</DialogTitle>
          <DialogDescription>
            No se crea ningún ticket. Quien la pidió recibe un aviso con el
            motivo.
          </DialogDescription>
        </DialogHeader>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Motivo
          <Textarea
            rows={3}
            value={reason}
            placeholder="Duplicada con el ticket #120, no es de esta área…"
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
            variant="destructive"
            onClick={confirm}
            disabled={isPending || reason.trim().length < 3}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Descartar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
