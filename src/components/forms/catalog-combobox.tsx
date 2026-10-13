// src/components/forms/catalog-combobox.tsx
// Selector con búsqueda sobre un catálogo ({ id, label, hint }); devuelve el id elegido o null.
"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type CatalogOption = { id: string; label: string; hint?: string };

type Props = {
  id?: string;
  options: CatalogOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function CatalogCombobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
}: Props) {
  const selected = options.find((option) => option.id === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(option) => onChange(option?.id ?? null)}
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      // POR QUÉ: escribir y Enter elige la primera coincidencia, como en una planilla.
      autoHighlight
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder ?? "Buscar…"}
        aria-invalid={invalid || undefined}
        showClear={selected !== null && !disabled}
        disabled={disabled}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty>Sin coincidencias. Prueba con otro texto.</ComboboxEmpty>
        <ComboboxList>
          {(option: CatalogOption) => (
            <ComboboxItem key={option.id} value={option}>
              <span className="truncate">{option.label}</span>
              {option.hint && (
                <span className="ml-auto pl-3 text-xs text-muted-foreground">
                  {option.hint}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
