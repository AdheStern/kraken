// src/components/forms/catalog-multi-combobox.tsx
// Selector múltiple con búsqueda y fichas sobre un catálogo; devuelve la lista de ids elegidos.
"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { type CatalogOption, useCatalogFilter } from "./catalog-combobox";

type Props = {
  id?: string;
  options: CatalogOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function CatalogMultiCombobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
}: Props) {
  const anchor = useComboboxAnchor();
  const selected = options.filter((option) => value.includes(option.id));
  const filter = useCatalogFilter();

  return (
    <Combobox
      multiple
      items={options}
      filter={filter}
      value={selected}
      onValueChange={(chosen) => onChange(chosen.map((option) => option.id))}
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      // POR QUÉ: escribir y Enter elige la primera coincidencia, como en una planilla.
      autoHighlight
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(chosen: CatalogOption[]) =>
            chosen.map((option) => (
              <ComboboxChip key={option.id} showRemove={!disabled}>
                {option.label}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput
          id={id}
          placeholder={
            selected.length === 0 ? (placeholder ?? "Buscar…") : undefined
          }
          aria-invalid={invalid || undefined}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
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
