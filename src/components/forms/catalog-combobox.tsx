// src/components/forms/catalog-combobox.tsx
// Selector con búsqueda sobre un catálogo ({ id, label, hint }) por etiqueta o ayuda; devuelve el id elegido o null.
// Si las opciones son personas (traen image), muestra su foto de Microsoft o sus iniciales (decisión 2026-11-07).
// Al abrirlo muestra todas las opciones; al escribir quedan las que coinciden, la más parecida primero
// (rankCatalogOptions; «La Paz, Achocalla» busca ayuda y etiqueta). Es también la base de OptionSelect.
"use client";

import { type ComponentProps, useState } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { rankCatalogOptions, rankOption } from "@/lib/rank-catalog-options";
import { cn } from "@/lib/utils";

// POR QUÉ: image presente (aunque sea null) marca la opción como persona; null muestra sus iniciales.
export type CatalogOption = {
  id: string;
  label: string;
  hint?: string;
  image?: string | null;
};

type Props = {
  id?: string;
  options: CatalogOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  // Sin él no se ofrece el botón de vaciar (OptionSelect: el vacío es una opción más, si la hay).
  clearable?: boolean;
  // Para formularios GET sin JavaScript: el id elegido viaja en un campo oculto.
  name?: string;
  // Atributos del campo de texto (aria-label, data-cell, title, onKeyDown…) y su tamaño.
  inputProps?: ComponentProps<"input"> & Record<`data-${string}`, string>;
  className?: string;
  contentClassName?: string;
};

// POR QUÉ: también se busca por el texto de ayuda (NIT, código de ciudad, nombre del área), que los
// placeholders ofrecen ("Nombre o NIT", "LP, SC o CB").
export function useCatalogFilter() {
  return (option: CatalogOption, query: string) =>
    rankOption(option, query) !== null;
}

export function CatalogCombobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  clearable = true,
  name,
  inputProps,
  className,
  contentClassName,
}: Props) {
  const selected = options.find((option) => option.id === value) ?? null;
  const [query, setQuery] = useState("");

  return (
    <Combobox
      items={options}
      // POR QUÉ: Base UI filtra sin ordenar; con «la paz» el municipio La Paz quedaba entre los del departamento.
      // Mientras el texto sea la etiqueta elegida, Base UI ignora esta lista y muestra todas.
      filteredItems={rankCatalogOptions(options, query)}
      onInputValueChange={setQuery}
      value={selected}
      onValueChange={(option) => onChange(option?.id ?? null)}
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(a, b) => a.id === b.id}
      // POR QUÉ: escribir y Enter elige la primera coincidencia, como en una planilla.
      autoHighlight
      disabled={disabled}
    >
      <ComboboxInput
        {...inputProps}
        id={id}
        placeholder={placeholder ?? "Buscar…"}
        aria-invalid={invalid || undefined}
        showClear={clearable && selected !== null && !disabled}
        disabled={disabled}
        className={cn("w-full", className)}
        // POR QUÉ: escribir reemplaza la opción elegida en vez de sumarse a su etiqueta, y filtra desde la primera letra.
        onFocus={(event) => event.currentTarget.select()}
      >
        {selected && isPerson(selected) && (
          <InputGroupAddon align="inline-start">
            <PersonAvatar
              name={selected.label}
              image={selected.image ?? null}
              className="size-5 text-[9px]"
            />
          </InputGroupAddon>
        )}
      </ComboboxInput>
      {/* POR QUÉ: la lista crece hasta mostrar el nombre entero (razón social larga + NIT) aunque el campo sea angosto;
          con más de 32rem el nombre baja de renglón en vez de cortarse. */}
      <ComboboxContent
        className={cn(
          "w-max max-w-[min(var(--available-width),32rem)]",
          contentClassName,
        )}
      >
        <ComboboxEmpty>Sin coincidencias. Prueba con otro texto.</ComboboxEmpty>
        <ComboboxList>
          {(option: CatalogOption) => (
            <ComboboxItem key={option.id} value={option}>
              <OptionAvatar option={option} />
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
              {option.hint && (
                <span className="shrink-0 pl-3 text-xs whitespace-nowrap text-muted-foreground">
                  {option.hint}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
    </Combobox>
  );
}

export function isPerson(option: CatalogOption) {
  return option.image !== undefined;
}

export function OptionAvatar({
  option,
  className = "size-6 text-[10px]",
}: {
  option: CatalogOption;
  className?: string;
}) {
  if (!isPerson(option)) return null;
  return (
    <PersonAvatar
      name={option.label}
      image={option.image ?? null}
      className={className}
    />
  );
}
