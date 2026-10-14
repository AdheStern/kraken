// src/features/sales-control/components/lines/grid-cells.tsx
// Celdas editables de la grilla del CV: texto, número (acepta formato de Excel) y selector nativo.
// Cada celda lleva data-cell="fila:columna" para moverse con el teclado como en una planilla.
"use client";

import type { ComponentProps } from "react";
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";

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
    <input
      data-cell={`${row}:${col}`}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      title={error}
      disabled={disabled}
      className={`${CELL} ${className ?? ""}`}
      {...props}
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
    <select
      data-cell={`${row}:${col}`}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      title={error}
      disabled={disabled}
      value={value ?? ""}
      onChange={(event) => onValueChange(event.target.value || null)}
      className={`${CELL} cursor-pointer pr-1 disabled:cursor-default disabled:appearance-none`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
