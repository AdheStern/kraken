// src/features/tickets/components/historical/historical-fill-popover.tsx
// Encabezado de una columna desplegable de la carga histórica: elige un valor y lo pone en todas las filas o solo
// en las vacías, como en la grilla del CV (decisión 2026-11-10).
"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/ui/option-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  label: string;
  options: { id: string; label: string; hint?: string }[];
  onApply: (value: string, onlyEmpty: boolean) => void;
};

const TRIGGER =
  "-mx-1 inline-flex items-center gap-0.5 rounded px-1 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

export function HistoricalFillPopover({ label, options, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const apply = (onlyEmpty: boolean) => {
    if (!value) return;
    onApply(value, onlyEmpty);
    setOpen(false);
    setValue(null);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={TRIGGER}
        aria-label={`${label}: aplicar a todas las filas`}
        title={`${label}: aplicar a todas las filas`}
      >
        {label}
        <ChevronDown className="size-3" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <p className="text-xs font-medium text-muted-foreground">
          Aplicar a todas las filas
        </p>
        <OptionSelect
          aria-label={`${label} para aplicar`}
          size="sm"
          value={value}
          options={options}
          placeholder={label}
          onValueChange={setValue}
        />
        <div className="flex gap-1.5">
          <Button size="xs" disabled={!value} onClick={() => apply(false)}>
            Aplicar a todas
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={!value}
            onClick={() => apply(true)}
          >
            Solo a las vacías
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
