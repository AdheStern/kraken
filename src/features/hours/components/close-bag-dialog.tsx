// src/features/hours/components/close-bag-dialog.tsx
// Cierre manual de una bolsa con motivo: el saldo se ajusta a 0 y deja de aceptar consumos (AGENTS.md §8).
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
import { formatMinutes } from "@/lib/format-minutes";
import { closeHourBag } from "../actions/close-hour-bag";

type Props = { bagId: string; balanceMinutes: number };

export function CloseBagDialog({ bagId, balanceMinutes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    setIsPending(true);
    setError(null);
    const result = await closeHourBag({ bagId, reason });
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
        Cerrar bolsa
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar la bolsa</DialogTitle>
          <DialogDescription>
            {balanceMinutes > 0
              ? `Se registra un ajuste de −${formatMinutes(balanceMinutes)} y la bolsa deja de aceptar consumos.`
              : "La bolsa deja de aceptar consumos."}{" "}
            Una bolsa cerrada no se reabre.
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
            variant="destructive"
            onClick={confirm}
            disabled={isPending || reason.trim().length < 5}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Cerrar bolsa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
