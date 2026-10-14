// src/features/hours/components/adjust-bag-dialog.tsx
// Ajuste manual de una bolsa: sumar o restar horas con motivo, viendo el saldo resultante antes de confirmar.
"use client";

import Decimal from "decimal.js";
import { LoaderCircle, SlidersHorizontal } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import { formatMinutes } from "@/lib/format-minutes";
import { adjustHourBag } from "../actions/adjust-hour-bag";

type Operation = "SUMAR" | "RESTAR";
type Props = { bagId: string; balanceMinutes: number };

const HOURS = /^\d+(\.\d{1,2})?$/;

export function AdjustBagDialog({ bagId, balanceMinutes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState<Operation>("SUMAR");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const preview = previewBalance(hours, operation, balanceMinutes);

  async function confirm() {
    setIsPending(true);
    setError(null);
    const result = await adjustHourBag({ bagId, operation, hours, reason });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    setHours("");
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <SlidersHorizontal aria-hidden="true" />
        Ajustar saldo
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar saldo</DialogTitle>
          <DialogDescription>
            Queda en el libro como un ajuste con tu nombre y el motivo. Saldo
            actual: {formatMinutes(balanceMinutes)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-[auto_1fr] items-end gap-3">
            <div
              role="radiogroup"
              aria-label="Tipo de ajuste"
              className="flex rounded-lg border p-0.5"
            >
              {(["SUMAR", "RESTAR"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={operation === value}
                  variant={operation === value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setOperation(value)}
                >
                  {value === "SUMAR" ? "Sumar" : "Restar"}
                </Button>
              ))}
            </div>
            <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
              Horas
              <Input
                inputMode="decimal"
                placeholder="1.5"
                value={hours}
                onChange={(event) =>
                  setHours(event.target.value.replace(",", "."))
                }
                className="tabular-nums"
              />
            </Label>
          </div>
          <p
            aria-live="polite"
            className={
              preview.isInvalid
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {preview.text}
          </p>
          <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
            Motivo
            <Textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
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
        </div>
        <DialogFooter>
          <Button
            onClick={confirm}
            disabled={
              isPending ||
              preview.isInvalid ||
              preview.minutes === 0 ||
              reason.trim().length < 5
            }
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Registrar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// POR QUÉ: la misma conversión del dominio que usará el servidor; la vista previa no puede mentir.
function previewBalance(hours: string, operation: Operation, balance: number) {
  if (!HOURS.test(hours.trim()))
    return {
      minutes: 0,
      isInvalid: false,
      text: "Escribe las horas, p. ej. 1.5 o 2.25.",
    };
  const minutes = toBagMinutes(new Decimal(hours.trim())) ?? 0;
  const after = operation === "SUMAR" ? balance + minutes : balance - minutes;
  if (minutes === 0)
    return {
      minutes,
      isInvalid: true,
      text: "Las horas deben dar minutos enteros y ser mayores que 0.",
    };
  if (after < 0)
    return {
      minutes,
      isInvalid: true,
      text: `No puede quedar negativo: quedan ${formatMinutes(balance)}.`,
    };
  return {
    minutes,
    isInvalid: false,
    text: `Saldo resultante: ${formatMinutes(after)}.`,
  };
}
