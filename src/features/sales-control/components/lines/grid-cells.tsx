// src/features/sales-control/components/lines/grid-cells.tsx
// Celdas editables de la grilla del CV: texto, texto largo, número (acepta formato de Excel) y selector nativo.
// Cada celda lleva data-cell="fila:columna" para moverse con el teclado como en una planilla.
"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";
import { cn } from "@/lib/utils";

const CELL =
  "h-8 w-full min-w-0 rounded-[6px] border border-transparent bg-transparent px-2 text-[13px] outline-none transition-colors " +
  "hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30 disabled:opacity-60 " +
  "aria-invalid:border-destructive/60 aria-invalid:bg-destructive/5";

type CellBase = {
  row: number;
  col: number;
  label: string;
  error?: string;
  disabled?: boolean;
};

export function TextCell({
  row,
  col,
  label,
  error,
  disabled,
  className,
  ...props
}: CellBase & ComponentProps<"input">) {
  return (
    <Input
      data-cell={`${row}:${col}`}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      title={error}
      disabled={disabled}
      className={cn(CELL, "md:text-[13px] dark:bg-transparent", className)}
      {...props}
    />
  );
}

type TextAreaCellProps = CellBase & {
  value: string;
  onValueChange: (value: string) => void;
};

// REGLA de la planilla: Enter baja de fila como en las demás celdas; Alt+Enter agrega una línea, como en Excel.
// Crece con el texto hasta unas 6 líneas y después desplaza.
export function TextAreaCell({
  row,
  col,
  label,
  error,
  disabled,
  value,
  onValueChange,
}: TextAreaCellProps) {
  return (
    <textarea
      data-cell={`${row}:${col}`}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      title={error ?? "Alt+Enter: nueva línea"}
      disabled={disabled}
      rows={1}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !event.altKey) return;
        event.preventDefault();
        const { selectionStart: start, selectionEnd: end } =
          event.currentTarget;
        const field = event.currentTarget;
        onValueChange(`${value.slice(0, start)}\n${value.slice(end)}`);
        requestAnimationFrame(() =>
          field.setSelectionRange(start + 1, start + 1),
        );
      }}
      className={cn(
        CELL,
        "field-sizing-content h-auto max-h-32 min-h-8 resize-none py-1.5 leading-5",
      )}
    />
  );
}

type NumberCellProps = CellBase & {
  value: string;
  onValueChange: (value: string) => void;
  muted?: boolean;
  allowThousands?: boolean;
};

// POR QUÉ: al salir de la celda se normaliza "1.234,56" → "1234.56"; si no es número se deja para que la validación lo marque.
export function NumberCell({
  row,
  col,
  label,
  error,
  disabled,
  value,
  onValueChange,
  muted,
  allowThousands = true,
}: NumberCellProps) {
  return (
    <TextCell
      row={row}
      col={col}
      label={label}
      error={error}
      disabled={disabled}
      inputMode="decimal"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={(event) => {
        const parsed = parseDecimalText(event.target.value, { allowThousands });
        if (parsed !== null && parsed !== event.target.value)
          onValueChange(parsed);
      }}
      className={`text-right tabular-nums ${muted ? "text-muted-foreground" : ""}`}
    />
  );
}

type SelectCellProps = CellBase & {
  value: string | null;
  options: { id: string; label: string }[];
  onValueChange: (value: string | null) => void;
  placeholder?: string;
};

export function SelectCell({
  row,
  col,
  label,
  error,
  disabled,
  value,
  options,
  onValueChange,
  placeholder = "—",
}: SelectCellProps) {
  return (
    <OptionSelect
      data-cell={`${row}:${col}`}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      title={error}
      disabled={disabled}
      value={value}
      options={options}
      emptyLabel={placeholder}
      onValueChange={onValueChange}
      // REGLA de la planilla: Enter baja de fila (grid-keyboard.ts); la lista se abre con flechas, espacio o clic.
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventBaseUIHandler();
      }}
      className={`${CELL} h-8 gap-1 pr-1 data-popup-open:border-ring [&_svg]:opacity-60`}
    />
  );
}
