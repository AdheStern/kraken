// src/features/sales-control/components/lines/cv-group-row.tsx
// Encabezado de un lote ("LOTE 1"): nombre editable, subtotal propio y acciones del lote (AGENTS.md §2.1).
"use client";

import { Layers, Plus, StickyNote, Trash2 } from "lucide-react";
import { formatAmount } from "@/lib/format-amount";

type Props = {
  name: string;
  subtotalSaleUsd: string;
  lineCount: number;
  span: number;
  canEdit: boolean;
  onRename: (name: string) => void;
  onAddLine: () => void;
  onAddNote: () => void;
  onRemove: () => void;
};

const ACTION =
  "flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

export function CvGroupRow({
  name,
  subtotalSaleUsd,
  lineCount,
  span,
  canEdit,
  onRename,
  onAddLine,
  onAddNote,
  onRemove,
}: Props) {
  return (
    <tr className="border-y bg-secondary/70">
      <td colSpan={span} className="px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="size-4 text-primary" aria-hidden="true" />
          <input
            aria-label="Nombre del lote"
            value={name}
            disabled={!canEdit}
            onChange={(event) => onRename(event.target.value)}
            className="h-7 w-48 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-semibold outline-none hover:border-border focus:border-ring focus:bg-background"
          />
          <span className="text-xs text-muted-foreground">
            {lineCount} {lineCount === 1 ? "línea" : "líneas"} · subtotal{" "}
            <span className="font-medium text-foreground tabular-nums">
              USD {formatAmount(subtotalSaleUsd)}
            </span>
          </span>
          {canEdit && (
            <div className="ml-auto flex items-center gap-0.5">
              <button type="button" className={ACTION} onClick={onAddLine}>
                <Plus className="size-3.5" aria-hidden="true" /> Línea
              </button>
              <button type="button" className={ACTION} onClick={onAddNote}>
                <StickyNote className="size-3.5" aria-hidden="true" /> Nota
              </button>
              <button
                type="button"
                className={`${ACTION} hover:text-destructive`}
                onClick={onRemove}
                title="Las líneas del lote quedan sin lote"
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Quitar lote
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
