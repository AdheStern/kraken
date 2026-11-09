// src/components/ui/option-select.tsx
// Selector de una lista de opciones con búsqueda (CatalogCombobox): al abrirlo se ven todas y, al escribir,
// quedan las que coinciden. Su lista sigue el tema de la app, a diferencia del <select> nativo.
"use client";

import type { ComponentProps } from "react";
import {
  CatalogCombobox,
  type CatalogOption,
} from "@/components/forms/catalog-combobox";
import { cn } from "@/lib/utils";

export type SelectOption = { id: string; label: string };

// POR QUÉ: el vacío es una opción más de la lista; este id no choca con un uuid ni con un enum.
const EMPTY_ID = "";

type InputProps = Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "defaultValue" | "size" | "placeholder" | "name"
> &
  Record<`data-${string}`, string>;

type Props = InputProps & {
  value: string | null;
  options: readonly SelectOption[];
  onValueChange: (value: string | null) => void;
  // Opción vacía al principio de la lista (p. ej. "Sin tecnología"); sin ella, el vacío no se puede elegir.
  emptyLabel?: string;
  // Texto cuando no hay valor y no hay opción vacía.
  placeholder?: string;
  // Para formularios que se envían sin JavaScript (GET): el valor viaja en un campo oculto.
  name?: string;
  size?: "sm" | "default";
  contentClassName?: string;
};

export function OptionSelect({
  value,
  options,
  onValueChange,
  emptyLabel,
  placeholder = "Elige una opción",
  name,
  id,
  disabled,
  size,
  className,
  contentClassName,
  ...input
}: Props) {
  const items: CatalogOption[] =
    emptyLabel === undefined
      ? [...options]
      : [{ id: EMPTY_ID, label: emptyLabel }, ...options];
  const current = value ?? (emptyLabel === undefined ? null : EMPTY_ID);
  return (
    <CatalogCombobox
      id={id}
      options={items}
      value={current}
      onChange={(next) => {
        if (next === null) return;
        onValueChange(next === EMPTY_ID ? null : next);
      }}
      placeholder={placeholder}
      disabled={disabled}
      invalid={
        input["aria-invalid"] === true || input["aria-invalid"] === "true"
      }
      clearable={false}
      name={name}
      inputProps={input}
      className={cn(size === "sm" ? "h-8" : "h-9", className)}
      contentClassName={contentClassName}
    />
  );
}
