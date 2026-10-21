// src/features/inventory/components/receipt-rows-editor.tsx
// Grilla de las filas de un ingreso: se escribe a mano o se pega un bloque de Excel desde la columna Código
// (código, descripción, cantidad, costo unitario USD, seriales); el bloque reemplaza desde la fila donde se pega.
"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ClipboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type ReceiptDraftRow,
  toReceiptDraftRows,
} from "@/domain/inventory/parse-receipt-rows";

export const EMPTY_ROW: ReceiptDraftRow = {
  code: "",
  description: "",
  quantity: "",
  unitCostUsd: "",
  serials: "",
};

const FIELDS: {
  key: keyof ReceiptDraftRow;
  label: string;
  className: string;
  mono?: boolean;
}[] = [
  { key: "code", label: "Código", className: "w-36", mono: true },
  {
    key: "description",
    label: "Descripción (solo si es nuevo)",
    className: "min-w-48 flex-1",
  },
  { key: "quantity", label: "Cantidad", className: "w-24 text-right" },
  {
    key: "unitCostUsd",
    label: "Costo unit. USD",
    className: "w-32 text-right",
  },
  {
    key: "serials",
    label: "Seriales",
    className: "min-w-40 flex-1",
    mono: true,
  },
];

type Props = {
  rows: ReceiptDraftRow[];
  issueRows: ReadonlySet<number>;
  onChange: (rows: ReceiptDraftRow[]) => void;
};

export function ReceiptRowsEditor({ rows, issueRows, onChange }: Props) {
  const update = (index: number, patch: Partial<ReceiptDraftRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  // POR QUÉ: un bloque con tabuladores o saltos se reparte en filas como en Excel; un valor suelto se pega normal.
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const index = Number((event.target as HTMLElement).dataset.row);
    const text = event.clipboardData.getData("text/plain");
    if (Number.isNaN(index) || !/[\t\n]/.test(text.trimEnd())) return;
    event.preventDefault();
    const pasted = toReceiptDraftRows(text);
    onChange([
      ...rows.slice(0, index),
      ...pasted,
      ...rows.slice(index + pasted.length),
    ]);
  }

  return (
    <div className="grid gap-2" onPaste={handlePaste}>
      <ol className="kr-solid divide-y divide-border/60 rounded-xl">
        {rows.map((row, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: las filas no tienen identidad propia; su posición es su número.
            key={index}
            className="flex flex-wrap items-center gap-2 px-3 py-2"
            aria-invalid={issueRows.has(index + 1) || undefined}
          >
            <span
              className="w-6 text-right text-xs text-muted-foreground tabular-nums"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {FIELDS.map((field) => (
              <Input
                key={field.key}
                data-row={index}
                value={row[field.key]}
                placeholder={field.label}
                aria-label={`${field.label}, fila ${index + 1}`}
                inputMode={
                  field.key === "quantity" || field.key === "unitCostUsd"
                    ? "decimal"
                    : undefined
                }
                onChange={(e) => update(index, { [field.key]: e.target.value })}
                className={`h-9 ${field.className} ${field.mono ? "font-mono" : ""} ${
                  issueRows.has(index + 1) ? "border-destructive" : ""
                }`}
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar la fila ${index + 1}`}
              onClick={() =>
                onChange(
                  rows.length > 1
                    ? rows.filter((_, i) => i !== index)
                    : [EMPTY_ROW],
                )
              }
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...rows, EMPTY_ROW])}
      >
        <Plus aria-hidden="true" />
        Agregar fila
      </Button>
    </div>
  );
}
