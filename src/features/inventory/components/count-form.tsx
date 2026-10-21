// src/features/inventory/components/count-form.tsx
// Conteo físico de un almacén (AGENTS.md §2.8): completo (lo no contado es faltante) o parcial; se escanea el
// serial o el código, o se agrega por código lo que el sistema no tiene. Las diferencias piden un ajuste.
"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { submitInventoryCount } from "../actions/submit-inventory-count";
import type { PosCatalogItem } from "../types";
import { type CountLine, CountLines } from "./count-lines";
import { PosScanner } from "./pos-scanner";

type Props = {
  warehouseId: string;
  startedAt: string;
  catalog: PosCatalogItem[];
};

const SCOPES = [
  {
    id: "PARCIAL",
    label: "Parcial",
    hint: "Solo se comparan los productos contados.",
  },
  {
    id: "COMPLETO",
    label: "Completo",
    hint: "Lo que no se cuente se toma como faltante.",
  },
] as const;

export function CountForm({ warehouseId, startedAt, catalog }: Props) {
  const [scope, setScope] = useState<"PARCIAL" | "COMPLETO">("PARCIAL");
  const [lines, setLines] = useState<CountLine[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ differences: number } | null>(null);

  function onScan(text: string) {
    const value = text.trim().toUpperCase();
    if (!value) return { ok: false, message: "Escanea o escribe un código." };
    const bySerial = catalog.find((i) =>
      i.serials.some((s) => s.toUpperCase() === value),
    );
    const item =
      bySerial ?? catalog.find((i) => i.code.toUpperCase() === value);
    const code = item?.code ?? value;
    const current = lines.find((l) => l.code === code) ?? {
      code,
      description: item?.description ?? "",
      isSerialized: item?.isSerialized ?? false,
      quantity: "0",
      serials: [],
      inStock: item !== undefined,
      unitCostUsd: "",
    };
    const serial = bySerial?.serials.find((s) => s.toUpperCase() === value);
    if (serial && current.serials.includes(serial))
      return { ok: false, message: `El serial ${serial} ya se contó.` };
    const next = serial
      ? { ...current, serials: [...current.serials, serial] }
      : { ...current, quantity: String(Number(current.quantity || 0) + 1) };
    setLines(
      lines.some((l) => l.code === code)
        ? lines.map((l) => (l.code === code ? next : l))
        : [...lines, next],
    );
    return {
      ok: true,
      message: item
        ? `${code} · contado`
        : `${code} · sin stock en este almacén; si existe en el catálogo, cuenta como sobrante`,
    };
  }

  async function submit() {
    setIsPending(true);
    setError(null);
    const result = await submitInventoryCount({
      warehouseId,
      scope,
      startedAt,
      items: lines.map((l) => ({
        code: l.code,
        quantity: l.isSerialized
          ? String(l.serials.length)
          : l.quantity.trim().replace(",", "."),
        serials: l.serials,
        unitCostUsd: l.unitCostUsd.trim().replace(",", "."),
      })),
    });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setDone(result.data);
  }

  if (done)
    return (
      <section
        className="kr-solid mx-auto grid w-full max-w-xl gap-4 rounded-xl p-6 text-center"
        aria-live="polite"
      >
        <h2 className="text-lg font-semibold">
          {done.differences === 0
            ? "El conteo coincide con el sistema."
            : `${done.differences} ${done.differences === 1 ? "diferencia" : "diferencias"}: se pidió el ajuste.`}
        </h2>
        <p className="text-sm text-muted-foreground">
          {done.differences === 0
            ? "No hay nada que ajustar en este almacén."
            : "Entra al kardex cuando lo aprueben Administración o el GG."}
        </p>
        {done.differences > 0 && (
          <Link
            href="/inventario/ajustes"
            className={buttonVariants({ className: "mx-auto h-12" })}
          >
            Ver el ajuste
          </Link>
        )}
      </section>
    );
  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Alcance del conteo</legend>
        {SCOPES.map((s) => (
          <Button
            key={s.id}
            variant={scope === s.id ? "default" : "outline"}
            className="h-auto min-h-12 flex-col gap-0.5 py-2"
            aria-pressed={scope === s.id}
            onClick={() => setScope(s.id)}
          >
            {s.label}
            <span className="text-xs font-normal opacity-80">{s.hint}</span>
          </Button>
        ))}
      </fieldset>
      <PosScanner onScan={onScan} />
      {lines.length > 0 && <CountLines lines={lines} onChange={setLines} />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="h-14 text-base"
        disabled={isPending || (lines.length === 0 && scope === "PARCIAL")}
        onClick={submit}
      >
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        Terminar conteo
      </Button>
    </div>
  );
}
