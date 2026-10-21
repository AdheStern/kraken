// src/features/inventory/components/receipt-form.tsx
// Ingreso a un almacén: almacén, origen, PO# y notas, la grilla de filas con sus errores en vivo y el total
// (AGENTS.md §2.8). La validación es la misma del servidor (parseReceiptRows).
"use client";

import Decimal from "decimal.js";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { parseReceiptRows } from "@/domain/inventory/parse-receipt-rows";
import { roundHalfUp2 } from "@/domain/pricing/money";
import type { ReceiptOrigin } from "@/generated/prisma/enums";
import { formatAmount } from "@/lib/format-amount";
import { registerReceipt } from "../actions/register-receipt";
import { formatQuantity } from "./inventory-labels";
import { ReceiptDone } from "./receipt-done";
import { EMPTY_ROW, ReceiptRowsEditor } from "./receipt-rows-editor";

const ORIGINS: { id: ReceiptOrigin; label: string }[] = [
  { id: "COMPRA_LOCAL", label: "Compra local" },
  { id: "IMPORTACION", label: "Importación" },
  { id: "INVENTARIO_INICIAL", label: "Inventario inicial" },
];

type Warehouse = { id: string; code: string; name: string };
type Props = { warehouses: Warehouse[]; defaultWarehouseId: string };

const freshRows = () => [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW];

export function ReceiptForm({ warehouses, defaultWarehouseId }: Props) {
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [origin, setOrigin] = useState<ReceiptOrigin>("COMPRA_LOCAL");
  const [documentRef, setDocumentRef] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState(freshRows);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    number: number;
    createdProducts: string[];
  } | null>(null);

  const { lines, issues } = parseReceiptRows(rows);
  const typed = rows.some((row) =>
    Object.values(row).some((v) => v.trim() !== ""),
  );
  const units = lines.reduce((sum, l) => sum.plus(l.quantity), new Decimal(0));
  const total = lines.reduce(
    (sum, l) => sum.plus(roundHalfUp2(l.unitCostUsd.mul(l.quantity))),
    new Decimal(0),
  );
  const warehouse = warehouses.find((w) => w.id === warehouseId);

  async function submit() {
    setIsPending(true);
    setError(null);
    const result = await registerReceipt({
      warehouseId,
      origin,
      documentRef,
      notes,
      idempotencyKey,
      rows,
    });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setDone(result.data);
  }

  function restart() {
    setRows(freshRows());
    setDocumentRef("");
    setNotes("");
    setIdempotencyKey(crypto.randomUUID());
    setDone(null);
  }

  if (done && warehouse)
    return <ReceiptDone {...done} warehouse={warehouse} onRestart={restart} />;
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="kr-surface grid gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Almacén">
          <OptionSelect
            aria-label="Almacén"
            value={warehouseId}
            options={warehouses.map((w) => ({ id: w.id, label: w.name }))}
            onValueChange={(id) => id && setWarehouseId(id)}
            className="h-9 w-full"
          />
        </Field>
        <Field label="Origen">
          <OptionSelect
            aria-label="Origen"
            value={origin}
            options={ORIGINS}
            onValueChange={(id) => id && setOrigin(id as ReceiptOrigin)}
            className="h-9 w-full"
          />
        </Field>
        <Field label="PO# o documento">
          <Input
            value={documentRef}
            onChange={(e) => setDocumentRef(e.target.value)}
            className="h-9"
          />
        </Field>
        <Field label="Notas">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9"
          />
        </Field>
      </div>
      <ReceiptRowsEditor
        rows={rows}
        issueRows={new Set(issues.map((i) => i.row))}
        onChange={setRows}
      />
      {typed && issues.length > 0 && (
        <ul className="grid gap-1 text-sm text-destructive" aria-live="polite">
          {issues.slice(0, 5).map((issue) => (
            <li key={`${issue.row}-${issue.message}`}>
              {issue.row > 0 ? `Fila ${issue.row}: ` : ""}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          {lines.length} {lines.length === 1 ? "línea" : "líneas"} ·{" "}
          {formatQuantity(units.toFixed(2))} unidades · USD{" "}
          {formatAmount(total.toFixed(2))}
        </p>
        <Button type="submit" disabled={isPending || issues.length > 0}>
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Registrar ingreso
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
