// src/features/admin/components/labeled-select.tsx
// Selector con su etiqueta visible, para los formularios de la administración. "" es "sin valor".
"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
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
      <OptionSelect
        id={id}
        value={value || null}
        options={options}
        emptyLabel={emptyLabel}
        onValueChange={(next) => onChange(next ?? "")}
      />
    </div>
  );
}
