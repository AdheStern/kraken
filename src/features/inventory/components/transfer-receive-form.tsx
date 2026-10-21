// src/features/inventory/components/transfer-receive-form.tsx
// Recepción de un traspaso: por línea lo que llegó (por defecto todo lo que sigue en camino) y, en los seriales,
// si llegó la unidad. Lo que no se marca queda en tránsito como diferencia (AGENTS.md §2.8).
"use client";

import { LoaderCircle, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { receiveTransfer } from "../actions/receive-transfer";
import type { TransferLineView } from "../types";
import { formatQuantity } from "./inventory-labels";

type Props = { transferId: string; lines: TransferLineView[] };

export function TransferReceiveForm({ transferId, lines }: Props) {
  const router = useRouter();
  const open = lines.filter((l) => l.pendingQuantity !== "0.00");
  const [arrived, setArrived] = useState(() =>
    Object.fromEntries(
      open.map((l) => [l.id, l.pendingQuantity.replace(/\.00$/, "")]),
    ),
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsPending(true);
    setError(null);
    const receipts = open
      .map((l) => ({
        transferLineId: l.id,
        quantity: (arrived[l.id] ?? "").trim(),
      }))
      .filter((r) => r.quantity !== "" && Number(r.quantity) > 0);
    const result = await receiveTransfer({ transferId, receipts });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  return (
    <section className="grid gap-3" aria-labelledby="recibir">
      <h2 id="recibir" className="text-sm font-medium">
        ¿Qué llegó?
      </h2>
      <ul className="kr-surface divide-y divide-border/60 rounded-xl">
        {open.map((line) => (
          <li
            key={line.id}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <span className="min-w-0 flex-1 basis-48 text-sm">
              <span className="font-mono text-xs font-medium">
                {line.productCode}
              </span>{" "}
              {line.serial
                ? `· serial ${line.serial}`
                : `· en camino ${formatQuantity(line.pendingQuantity)}`}
            </span>
            {line.serial ? (
              <Label className="flex h-12 items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={arrived[line.id] === "1"}
                  onCheckedChange={(checked) =>
                    setArrived({ ...arrived, [line.id]: checked ? "1" : "" })
                  }
                />
                Llegó
              </Label>
            ) : (
              <Input
                value={arrived[line.id] ?? ""}
                inputMode="decimal"
                aria-label={`Cantidad recibida de ${line.productCode}`}
                className="h-12 w-28 text-right text-base"
                onChange={(e) =>
                  setArrived({ ...arrived, [line.id]: e.target.value })
                }
              />
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="h-12 w-fit justify-self-end"
        disabled={isPending}
        onClick={submit}
      >
        {isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <PackageCheck aria-hidden="true" />
        )}
        Confirmar recepción
      </Button>
    </section>
  );
}
