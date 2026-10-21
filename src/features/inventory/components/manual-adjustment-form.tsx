// src/features/inventory/components/manual-adjustment-form.tsx
// Ajuste manual: almacén, área que lo aprueba (opcional), motivo y, por producto, la diferencia con signo, el costo
// si entra sin stock y los seriales. Queda pendiente hasta que lo apruebe quien corresponde (AGENTS.md §2.8).
"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";
import { requestManualAdjustment } from "../actions/request-manual-adjustment";

type Option = { id: string; label: string };
type Props = { warehouses: Option[]; areas: Option[] };

const EMPTY = { code: "", delta: "", unitCostUsd: "", serials: "" };
const FIELDS = [
  ["code", "Código", "w-36 font-mono"],
  ["delta", "Diferencia (+3, −2)", "w-36 text-right"],
  ["unitCostUsd", "Costo USD si no hay stock", "w-48 text-right"],
  ["serials", "Seriales", "min-w-40 flex-1 font-mono"],
] as const;

export function ManualAdjustmentForm({ warehouses, areas }: Props) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState<string | null>(
    warehouses[0]?.id ?? null,
  );
  const [areaId, setAreaId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState([EMPTY]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!warehouseId) return;
    setIsPending(true);
    setError(null);
    const result = await requestManualAdjustment({
      warehouseId,
      areaId,
      reason,
      rows: rows
        .filter((r) => r.code.trim())
        .map((r) => ({ ...r, delta: r.delta.replace("−", "-") })),
    });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    router.push("/inventario/ajustes");
  }

  return (
    <div className="grid gap-5">
      <div className="kr-surface grid gap-3 rounded-xl p-4 sm:grid-cols-2">
        <Label className="grid gap-1.5 text-xs font-normal text-muted-foreground">
          Almacén
          <OptionSelect
            aria-label="Almacén"
            value={warehouseId}
            options={warehouses}
            onValueChange={setWarehouseId}
            className="h-9 w-full"
          />
        </Label>
        <Label className="grid gap-1.5 text-xs font-normal text-muted-foreground">
          Área que lo aprueba
          <OptionSelect
            aria-label="Área que lo aprueba"
            value={areaId}
            options={areas}
            emptyLabel="Sin área (Administración o GG)"
            onValueChange={setAreaId}
            className="h-9 w-full"
          />
        </Label>
        <Label className="grid gap-1.5 text-xs font-normal text-muted-foreground sm:col-span-2">
          Motivo
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Label>
      </div>
      <ol className="kr-solid divide-y divide-border/60 rounded-xl">
        {rows.map((row, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: las filas no tienen identidad propia; su posición es su número.
            key={index}
            className="flex flex-wrap items-center gap-2 px-3 py-2"
          >
            {FIELDS.map(([key, label, className]) => (
              <Input
                key={key}
                value={row[key]}
                placeholder={label}
                aria-label={`${label}, fila ${index + 1}`}
                className={`h-9 ${className}`}
                onChange={(e) =>
                  setRows(
                    rows.map((r, i) =>
                      i === index ? { ...r, [key]: e.target.value } : r,
                    ),
                  )
                }
              />
            ))}
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Quitar la fila ${index + 1}`}
              onClick={() =>
                setRows(
                  rows.length > 1
                    ? rows.filter((_, i) => i !== index)
                    : [EMPTY],
                )
              }
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setRows([...rows, EMPTY])}
      >
        <Plus aria-hidden="true" />
        Agregar fila
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="w-fit justify-self-end"
        disabled={isPending || reason.trim().length < 5}
        onClick={submit}
      >
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        Pedir aprobación
      </Button>
    </div>
  );
}
