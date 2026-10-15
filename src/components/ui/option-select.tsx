// src/components/ui/option-select.tsx
// Selector de una lista de opciones sobre el Select de shadcn (Base UI): su lista sigue el tema y la identidad
// de la app, a diferencia del <select> nativo, que el sistema operativo pinta en blanco.
"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type SelectOption = { id: string; label: string };

type TriggerProps = Omit<
  React.ComponentProps<typeof SelectTrigger>,
  "children" | "value" | "onChange" | "defaultValue"
>;

type Props = TriggerProps & {
  value: string | null;
  options: readonly SelectOption[];
  onValueChange: (value: string | null) => void;
  // Opción vacía al principio de la lista (p. ej. "Sin tecnología"); sin ella, el vacío no se puede elegir.
  emptyLabel?: string;
  // Texto cuando no hay valor y no hay opción vacía.
  placeholder?: string;
  // Para formularios que se envían sin JavaScript (GET): el valor viaja en un campo oculto.
  name?: string;
  contentClassName?: string;
};

export function OptionSelect({
  value,
  options,
  onValueChange,
  emptyLabel,
  placeholder = "Elige una opción",
  name,
  disabled,
  className,
  contentClassName,
  ...trigger
}: Props) {
  const labelOf = (id: string | null) =>
    id === null
      ? (emptyLabel ?? placeholder)
      : (options.find((o) => o.id === id)?.label ?? placeholder);
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange((next as string | null) ?? null)}
      disabled={disabled}
      name={name}
    >
      <SelectTrigger
        className={cn("h-9 w-full", className)}
        data-empty={value === null ? true : undefined}
        {...trigger}
      >
        <SelectValue
          className={cn(
            value === null && !emptyLabel && "text-muted-foreground",
          )}
        >
          {(current: string | null) => labelOf(current)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {emptyLabel !== undefined && (
          <SelectItem value={null}>{emptyLabel}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
