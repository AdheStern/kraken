// src/features/inventory/components/receipt-item-dialog.tsx
// Cargar o editar una línea del ingreso tocando su mosaico: cantidad, costo unitario USD (obligatorio, admite 0) y
// seriales; para un producto nuevo, también código y descripción. Valida igual que el servidor (AGENTS.md §2.8).
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseReceiptRows,
  type ReceiptDraftRow,
} from "@/domain/inventory/parse-receipt-rows";

// `isNew`: el código no está en el catálogo; se crea «por revisar» para Administración.
export type ReceiptItemDraft = {
  row: ReceiptDraftRow;
  isNew: boolean;
  isSerialized: boolean;
};

type Props = {
  draft: ReceiptItemDraft | null;
  onClose: () => void;
  onSave: (row: ReceiptDraftRow) => void;
};

export function ReceiptItemDialog({ draft, onClose, onSave }: Props) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {draft && <ItemFields draft={draft} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function ItemFields({
  draft,
  onSave,
}: {
  draft: ReceiptItemDraft;
  onSave: (row: ReceiptDraftRow) => void;
}) {
  const [row, setRow] = useState(draft.row);
  const set = (patch: Partial<ReceiptDraftRow>) =>
    setRow((r) => ({ ...r, ...patch }));
  const serialCount = row.serials.split(/[\s,;]+/).filter(Boolean).length;
  // POR QUÉ: en un serializado la cantidad es la de sus seriales; así no se descuadran (§2.8).
  const effective = draft.isSerialized
    ? { ...row, quantity: serialCount > 0 ? String(serialCount) : "" }
    : row;
  const [issue] = parseReceiptRows([effective]).issues;
  // POR QUÉ: un error en rojo antes de escribir nada asusta; mientras la línea esté como se abrió, solo se orienta.
  const isPristine = JSON.stringify(row) === JSON.stringify(draft.row);
  const message =
    draft.isSerialized && serialCount === 0
      ? `Escribe o escanea el serial de cada unidad de ${row.code}.`
      : issue?.message;
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!issue) onSave(effective);
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {draft.isNew ? "Producto nuevo" : `Ingreso de ${row.code}`}
        </DialogTitle>
        <DialogDescription>
          {draft.isNew
            ? "Se crea en el catálogo para que Administración lo revise."
            : row.description}
        </DialogDescription>
      </DialogHeader>
      {draft.isNew && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código">
            <Input
              autoFocus
              value={row.code}
              onChange={(e) => set({ code: e.target.value })}
              className="h-12 font-mono"
            />
          </Field>
          <Field label="Descripción">
            <Input
              value={row.description}
              onChange={(e) => set({ description: e.target.value })}
              className="h-12"
            />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad">
          <Input
            autoFocus={!draft.isNew && !draft.isSerialized}
            inputMode="decimal"
            value={effective.quantity}
            readOnly={draft.isSerialized}
            placeholder={draft.isSerialized ? "según seriales" : ""}
            onChange={(e) => set({ quantity: e.target.value })}
            className="h-12 text-right text-lg tabular-nums"
          />
        </Field>
        <Field label="Costo unit. USD">
          <Input
            inputMode="decimal"
            value={row.unitCostUsd}
            onChange={(e) => set({ unitCostUsd: e.target.value })}
            className="h-12 text-right text-lg tabular-nums"
          />
        </Field>
      </div>
      {(draft.isSerialized || draft.isNew) && (
        <Field label="Seriales (uno por línea, o separados por coma)">
          <Textarea
            autoFocus={draft.isSerialized && !draft.isNew}
            rows={4}
            value={row.serials}
            onChange={(e) => set({ serials: e.target.value })}
            className="font-mono"
          />
        </Field>
      )}
      <p
        className={
          isPristine
            ? "min-h-5 text-sm text-muted-foreground"
            : "min-h-5 text-sm text-destructive"
        }
        aria-live="polite"
      >
        {message}
      </p>
      <DialogFooter>
        <Button type="submit" className="h-12 w-full" disabled={!!issue}>
          Guardar línea
        </Button>
      </DialogFooter>
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
    <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
      {label}
      {children}
    </Label>
  );
}
