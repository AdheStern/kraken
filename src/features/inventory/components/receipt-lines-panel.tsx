// src/features/inventory/components/receipt-lines-panel.tsx
// Panel del ingreso: cada línea como tarjeta (tocar la edita, × la quita), los errores de validación, el total y
// «Registrar ingreso». Los montos son los del operador de inventario, nunca llegan a un ingeniero (regla 12).
"use client";

import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ReceiptDraftRow,
  ReceiptRowIssue,
} from "@/domain/inventory/parse-receipt-rows";
import { isEmptyRow } from "./receipt-draft";

type Props = {
  rows: ReceiptDraftRow[];
  issues: ReceiptRowIssue[];
  totals: string;
  isPending: boolean;
  error: string | null;
  onEdit: (row: ReceiptDraftRow) => void;
  onRemove: (code: string) => void;
};

export function ReceiptLinesPanel({
  rows,
  issues,
  totals,
  isPending,
  error,
  onEdit,
  onRemove,
}: Props) {
  const filled = rows.filter((r) => !isEmptyRow(r));
  return (
    <>
      {filled.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Toca un producto para cargar su cantidad y su costo, o pega las filas
          en «Pegar desde Excel».
        </p>
      ) : (
        <ul className="grid gap-2">
          {filled.map((row, index) => (
            <li
              // POR QUÉ: el código puede repetirse mientras se escribe en Excel; la posición desempata.
              key={`${row.code}-${index}`}
              className="flex items-stretch gap-1 rounded-xl border bg-background/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
            >
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="grid min-h-14 flex-1 gap-0.5 rounded-xl px-3 py-2 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="font-mono text-sm font-medium">
                  {row.code.trim().toUpperCase() || "Sin código"}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {row.quantity || "?"} × USD {row.unitCostUsd || "?"}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-12"
                aria-label={`Quitar ${row.code}`}
                onClick={() => onRemove(row.code)}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {filled.length > 0 && issues.length > 0 && (
        <ul className="grid gap-1 text-sm text-destructive" aria-live="polite">
          {issues.slice(0, 5).map((issue) => (
            <li key={`${issue.row}-${issue.message}`}>
              {issue.row > 0 ? `Fila ${issue.row}: ` : ""}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted-foreground tabular-nums">{totals}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="h-14 text-base"
        disabled={isPending || issues.length > 0}
      >
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        Registrar ingreso
      </Button>
    </>
  );
}
