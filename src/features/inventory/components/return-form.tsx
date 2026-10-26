// src/features/inventory/components/return-form.tsx
// Devolución de una salida (AGENTS.md §2.8): por línea, cuánto vuelve (un serial vuelve entero), con nota opcional.
// Vuelve al almacén de origen al costo de esa salida; si fue a un CV, reabre su reserva.
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { returnItems } from "../actions/return-items";
import type { ReturnSource } from "../types";
import { formatQuantity } from "./inventory-labels";
import { PosDone } from "./pos-done";

export function ReturnForm({ source }: { source: ReturnSource }) {
  const router = useRouter();
  // POR QUÉ: la misma clave en cada reintento; un doble clic no registra dos devoluciones.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; number: number } | null>(null);
  const open = source.lines.filter((l) => l.remaining !== "0");
  const set = (lineId: string, value: string) =>
    setQuantities((q) => ({ ...q, [lineId]: value }));

  async function submit() {
    setIsPending(true);
    setError(null);
    const result = await returnItems({
      movementId: source.movementId,
      lines: Object.entries(quantities)
        .filter(([, quantity]) => quantity.trim())
        .map(([lineId, quantity]) => ({ lineId, quantity })),
      notes,
      idempotencyKey,
    });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setDone({ id: result.data.movementId, number: result.data.number });
  }

  if (done)
    return (
      <PosDone
        movementId={done.id}
        number={done.number}
        title="Devolución"
        restartLabel="Otra devolución"
        onRestart={() => router.push("/inventario/devoluciones/nueva")}
      />
    );
  if (open.length === 0)
    return (
      <p className="kr-solid rounded-xl p-6 text-sm text-muted-foreground">
        Todo lo de la salida N.º {source.number} ya volvió al almacén. Busca
        otra salida por el número de su comprobante.
      </p>
    );
  return (
    <div className="grid gap-4">
      <ul className="kr-solid divide-y rounded-xl">
        {open.map((line) => (
          <li
            key={line.lineId}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm">{line.code}</p>
              <p className="text-sm text-muted-foreground">
                {line.description}
                {line.serial && ` · serial ${line.serial}`}
              </p>
            </div>
            {line.serial ? (
              <Label className="gap-2 text-sm font-normal">
                <Checkbox
                  checked={quantities[line.lineId] === "1"}
                  onCheckedChange={(on) => set(line.lineId, on ? "1" : "")}
                />
                Vuelve
              </Label>
            ) : (
              <Label className="gap-2 text-xs font-normal text-muted-foreground">
                Vuelve (de {formatQuantity(line.remaining)})
                <Input
                  inputMode="decimal"
                  value={quantities[line.lineId] ?? ""}
                  onChange={(e) => set(line.lineId, e.target.value)}
                  className="h-9 w-24 text-right tabular-nums"
                  placeholder="0"
                />
              </Label>
            )}
          </li>
        ))}
      </ul>
      <Label className="grid gap-1.5 text-xs font-normal text-muted-foreground">
        Nota (opcional)
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={300}
          placeholder="Por qué vuelve: sobró, equipo cambiado…"
        />
      </Label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="h-11 justify-self-end"
        onClick={submit}
        disabled={isPending}
      >
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        Registrar devolución
      </Button>
    </div>
  );
}
