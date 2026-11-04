// src/features/inventory/components/count-form.tsx
// Conteo físico de un almacén (AGENTS.md §2.8): completo (lo no contado es faltante) o parcial; se escanea el
// serial o el código, se toca el mosaico del producto o se agrega por código lo que el sistema no tiene. Las
// diferencias piden un ajuste. Mismo marco de mosaicos que el POS, para tablet.
"use client";

import { LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { submitInventoryCount } from "../actions/submit-inventory-count";
import type { PosCatalogItem } from "../types";
import { addCounted, countedOf, setCountedSerials } from "./count-cart";
import { CountDone } from "./count-done";
import { type CountLine, CountLines } from "./count-lines";
import { PosScanner } from "./pos-scanner";
import { PosWorkspace } from "./pos-workspace";
import type { TileItem } from "./product-tile";
import { ProductTileGrid } from "./product-tile-grid";
import { SerialPickerDialog } from "./serial-picker-dialog";

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
  const [picking, setPicking] = useState<PosCatalogItem | null>(null);
  const scannerRef = useRef<HTMLInputElement>(null);

  function onScan(text: string) {
    const result = addCounted(lines, catalog, text);
    if (result.ok) setLines(result.lines);
    return result;
  }

  function onPick(tile: TileItem, pointerType: string) {
    const item = catalog.find((i) => i.code === tile.id);
    if (!item) return;
    if (item.isSerialized) return setPicking(item);
    const result = addCounted(lines, catalog, item.code);
    if (result.ok) setLines(result.lines);
    // TRAMPA: en la tablet, enfocar el campo abre el teclado en pantalla; solo se devuelve con mouse o lápiz.
    if (pointerType !== "touch") scannerRef.current?.focus();
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

  if (done) return <CountDone differences={done.differences} />;
  const lineOf = (code: string) => lines.find((l) => l.code === code);
  const counted = lines.reduce((sum, l) => sum + countedOf(l), 0);
  return (
    <PosWorkspace
      title="Conteo"
      summary={counted === 1 ? "1 unidad" : `${counted} unidades`}
      products={
        <>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">Alcance del conteo</legend>
            {SCOPES.map((s) => (
              <Button
                key={s.id}
                variant={scope === s.id ? "default" : "outline"}
                className="h-auto min-h-12 flex-col gap-0.5 py-2 whitespace-normal"
                aria-pressed={scope === s.id}
                onClick={() => setScope(s.id)}
              >
                {s.label}
                <span className="text-center text-xs font-normal opacity-80">
                  {s.hint}
                </span>
              </Button>
            ))}
          </fieldset>
          <PosScanner onScan={onScan} inputRef={scannerRef} />
          <ProductTileGrid
            items={catalog.map((item) => toTile(item, lineOf(item.code)))}
            picked={(code) => countedOf(lineOf(code))}
            onPick={onPick}
            emptyText="El sistema no tiene stock en este almacén: escanea lo que encuentres."
          />
          <SerialPickerDialog
            pick={
              picking && {
                code: picking.code,
                description: picking.description,
                serials: picking.serials,
                selected: lineOf(picking.code)?.serials ?? [],
              }
            }
            onClose={() => setPicking(null)}
            onConfirm={(serials) => {
              if (picking) setLines(setCountedSerials(lines, picking, serials));
              setPicking(null);
            }}
          />
        </>
      }
      panel={
        <>
          <CountLines lines={lines} onChange={setLines} />
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
        </>
      }
    />
  );
}

// POR QUÉ: el conteo es a ciegas; el mosaico dice lo contado, nunca lo que el sistema espera.
function toTile(item: PosCatalogItem, line: CountLine | undefined): TileItem {
  return {
    id: item.code,
    code: item.code,
    description: item.description,
    technology: item.technology,
    isSerialized: item.isSerialized,
    serials: item.serials,
    figureLabel: "Contado",
    figure: String(countedOf(line)),
  };
}
