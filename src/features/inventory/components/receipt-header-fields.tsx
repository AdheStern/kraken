// src/features/inventory/components/receipt-header-fields.tsx
// Cabecera del ingreso: almacén, origen (compra local, importación o inventario inicial), PO# y notas, con
// objetivos de 48 px para tablet (AGENTS.md §2.8).
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import type { ReceiptOrigin } from "@/generated/prisma/enums";

const ORIGINS: { id: ReceiptOrigin; label: string }[] = [
  { id: "COMPRA_LOCAL", label: "Compra local" },
  { id: "IMPORTACION", label: "Importación" },
  { id: "INVENTARIO_INICIAL", label: "Inventario inicial" },
];

export type ReceiptHeader = {
  warehouseId: string;
  origin: ReceiptOrigin;
  documentRef: string;
  notes: string;
};

type Props = {
  warehouses: { id: string; name: string }[];
  value: ReceiptHeader;
  onChange: (patch: Partial<ReceiptHeader>) => void;
};

export function ReceiptHeaderFields({ warehouses, value, onChange }: Props) {
  return (
    <div className="kr-surface grid gap-3 rounded-xl p-4 sm:grid-cols-2">
      <Field label="Almacén">
        <OptionSelect
          aria-label="Almacén"
          value={value.warehouseId}
          options={warehouses.map((w) => ({ id: w.id, label: w.name }))}
          onValueChange={(id) => id && onChange({ warehouseId: id })}
          className="h-12 w-full"
        />
      </Field>
      <Field label="Origen">
        <OptionSelect
          aria-label="Origen"
          value={value.origin}
          options={ORIGINS}
          onValueChange={(id) =>
            id && onChange({ origin: id as ReceiptOrigin })
          }
          className="h-12 w-full"
        />
      </Field>
      <Field label="PO# o documento">
        <Input
          value={value.documentRef}
          onChange={(e) => onChange({ documentRef: e.target.value })}
          className="h-12"
        />
      </Field>
      <Field label="Notas">
        <Input
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="h-12"
        />
      </Field>
    </div>
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
