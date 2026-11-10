// src/features/sales-control/components/lines/column-fill-popover.tsx
// «Aplicar a todas»: elige un valor de una columna desplegable y lo pone en todos los ítems del alcance (el CV o
// un lote), o solo en los que la tienen vacía. Con varias columnas, primero se elige cuál.
"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/ui/option-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CvGridOptions } from "../../types";
import { COLUMNS } from "./grid-columns";
import { SELECT_COLUMNS, type SelectColumnKey } from "./select-columns";

type Props = {
  columns: SelectColumnKey[];
  options: CvGridOptions;
  scopeLabel: string;
  ariaLabel: string;
  triggerClassName: string;
  children: ReactNode;
  onApply: (column: SelectColumnKey, value: string, onlyEmpty: boolean) => void;
};

export function ColumnFillPopover({
  columns,
  options,
  scopeLabel,
  ariaLabel,
  triggerClassName,
  children,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [column, setColumn] = useState(columns[0]);
  const [value, setValue] = useState<string | null>(null);
  const label = COLUMNS[column].label;
  const apply = (onlyEmpty: boolean) => {
    if (!value) return;
    onApply(column, value, onlyEmpty);
    setOpen(false);
    setValue(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={triggerClassName}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <p className="text-xs font-medium text-muted-foreground">
          Aplicar a {scopeLabel}
        </p>
        {columns.length > 1 && (
          <OptionSelect
            aria-label="Columna"
            size="sm"
            value={column}
            options={columns.map((key) => ({
              id: key,
              label: COLUMNS[key].label,
            }))}
            onValueChange={(next) => {
              if (!next) return;
              setColumn(next as SelectColumnKey);
              setValue(null);
            }}
          />
        )}
        <OptionSelect
          aria-label={`${label} para aplicar`}
          size="sm"
          value={value}
          options={SELECT_COLUMNS[column].items(options)}
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
