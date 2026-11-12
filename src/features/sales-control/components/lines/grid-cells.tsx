// src/features/sales-control/components/lines/grid-cells.tsx
// Celdas editables de la grilla del CV: texto, texto largo, número (acepta formato de Excel) y selector (shadcn).
// Cada celda lleva data-cell="fila:columna" para moverse con el teclado como en una planilla.
"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";
import { cn } from "@/lib/utils";

const CELL =
  "h-8 rounded-[6px] border border-transparent bg-transparent px-2 text-[13px] outline-none transition-colors " +
  "hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30 disabled:opacity-60 " +
  "aria-invalid:border-destructive/60 aria-invalid:bg-destructive/5";

// REGLA de la planilla: ninguna celda corta su contenido. Cada campo mide su texto (como mínimo el ancho de la
// columna) y la tabla, que se ajusta al contenido, ensancha la columna (decisión 2026-11-11).
const FIT = "w-auto min-w-full field-sizing-content";

// POR QUÉ: los selectores y el rango de la grilla son un campo dentro de un grupo; su texto va como el de las celdas y
// el campo interno mide su texto para que el grupo (y la columna) crezca con la opción elegida.
export const CELL_INPUT =
  "w-auto min-w-full [&_input]:min-w-fit [&_input]:px-2 [&_input]:text-[13px] [&_input]:field-sizing-content";

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
      className={cn(CELL, FIT, "md:text-[13px] dark:bg-transparent", className)}
      {...props}
    />
  );
}

type TextAreaCellProps = CellBase & {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  // Se puede agrandar a mano además de crecer con el texto (seriales).
  isResizable?: boolean;
};

// REGLA de la planilla: Enter baja de fila como en las demás celdas; Alt+Enter agrega una línea, como en Excel.
// Crece con el texto (descripciones y observaciones largas se leen enteras) hasta unas 6 líneas y después desplaza.
export function TextAreaCell({
  row,
  col,
  label,
  error,
  disabled,
  value,
  onValueChange,
  placeholder,
  isResizable = false,
}: TextAreaCellProps) {
  return (
    <Textarea
      data-cell={`${row}:${col}`}
      aria-label={label}
      aria-invalid={error ? true : undefined}
      title={error ?? "Alt+Enter: nueva línea"}
      disabled={disabled}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !event.altKey) return;
        event.preventDefault();
        // TRAMPA: el cursor se coloca en el mismo evento; diferirlo (requestAnimationFrame) movía la primera tecla
        // escrita rápido al final del texto. React no toca el cursor si el valor que recibe ya es el del campo.
        const field = event.currentTarget;
        field.setRangeText(
          "\n",
          field.selectionStart,
          field.selectionEnd,
          "end",
        );
        onValueChange(field.value);
      }}
      className={cn(
        CELL,
        "field-sizing-content h-auto w-full min-w-0 max-h-32 min-h-8 resize-none py-1.5 leading-5 shadow-none focus-visible:ring-2 focus-visible:ring-ring/30 md:text-[13px] dark:bg-transparent",
        // POR QUÉ: una lista de seriales puede ser larga; crece hasta ~13 líneas y se puede ajustar a mano.
        isResizable && "max-h-80 resize-y",
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
      // REGLA de la planilla: con la lista cerrada, Enter baja de fila (grid-keyboard.ts); se abre al escribir,
      // con las flechas o con un clic.
      className={`${CELL} ${CELL_INPUT} px-0 pr-1 [&_svg]:opacity-60`}
    />
  );
}
