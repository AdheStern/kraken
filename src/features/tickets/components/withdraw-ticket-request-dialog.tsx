// src/features/tickets/components/withdraw-ticket-request-dialog.tsx
// Confirmación para retirar una solicitud propia que sigue pendiente (AGENTS.md §2.6 «Solicitudes de ticket»).
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
import { withdrawTicketRequest } from "../actions/withdraw-ticket-request";

type Props = { requestId: string; number: number };

export function WithdrawTicketRequestDialog({ requestId, number }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    setIsPending(true);
    setError(null);
    const result = await withdrawTicketRequest({ requestId });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Retirar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retirar la solicitud #{number}</DialogTitle>
          <DialogDescription>
            Úsalo si el problema se resolvió o ya no lo necesitas. Deja de
            aparecer a los coordinadores; si vuelve a pasar, crea una nueva.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button onClick={confirm} disabled={isPending}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Retirar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
