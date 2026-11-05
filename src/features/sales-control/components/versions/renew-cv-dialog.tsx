// src/features/sales-control/components/versions/renew-cv-dialog.tsx
// «Renovar»: elige las líneas con vigencia del CV aprobado y crea el CV de renovación con su periodo siguiente
// (AGENTS.md §2.1 "Vigencia", decisión 2026-11-05). Se abre solo con ?renovar=1 (enlace del tablero).
"use client";

import { LoaderCircle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shiftCoverage } from "@/domain/sales-control/shift-coverage";
import { createRenewalCv } from "../../actions/create-renewal-cv";

export type RenewableLine = {
  id: string;
  description: string;
  coverageStart: string;
  coverageEnd: string;
};

type Props = { cvId: string; lines: RenewableLine[]; autoOpen: boolean };

export function RenewCvDialog({ cvId, lines, autoOpen }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [selected, setSelected] = useState(() => lines.map((l) => l.id));
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function renew() {
    setIsPending(true);
    setError(null);
    const result = await createRenewalCv({ cvId, lineIds: selected });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.push(`/cv/${result.data.cvId}`);
  }

  const toggle = (id: string, checked: boolean) =>
    setSelected((ids) =>
      checked ? [...ids, id] : ids.filter((other) => other !== id),
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <RefreshCcw aria-hidden="true" />
        Renovar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear CV de renovación</DialogTitle>
          <DialogDescription>
            Un CV nuevo con las líneas elegidas, sus precios y la vigencia del
            periodo siguiente. Ajustas lo que cambie y lo envías a aprobación.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {lines.map((line) => {
            // POR QUÉ: sin inicio no se sabe cuánto dura el periodo; la línea se copia y la vigencia se completa a mano.
            const next = line.coverageStart
              ? shiftCoverage({
                  start: line.coverageStart,
                  end: line.coverageEnd,
                })
              : null;
            return (
              <li key={line.id}>
                <label
                  htmlFor={`renew-${line.id}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/60"
                >
                  <Checkbox
                    id={`renew-${line.id}`}
                    className="mt-0.5"
                    checked={selected.includes(line.id)}
                    onCheckedChange={(checked) => toggle(line.id, checked)}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm">{line.description}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Vence {toDay(line.coverageEnd)} ·{" "}
                      {next
                        ? `nueva vigencia ${toDay(next.start)} – ${toDay(next.end)}`
                        : "completa la nueva vigencia en el CV"}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button onClick={renew} disabled={isPending || selected.length === 0}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {isPending
              ? "Creando…"
              : `Crear CV con ${selected.length} ${selected.length === 1 ? "línea" : "líneas"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toDay(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}
