// src/features/admin/components/labeled-select.tsx
// Selector nativo con su etiqueta visible, para los formularios de la administración.
"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CatalogOption } from "../types";

type Props = {
  label: string;
  value: string;
  options: CatalogOption[];
  onChange: (value: string) => void;
  emptyLabel?: string;
  className?: string;
};

export function LabeledSelect({
  label,
  value,
  options,
  onChange,
  emptyLabel,
  className,
}: Props) {
  const id = useId();
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
      >
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
