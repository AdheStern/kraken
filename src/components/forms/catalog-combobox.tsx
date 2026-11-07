// src/components/forms/catalog-combobox.tsx
// Selector con búsqueda sobre un catálogo ({ id, label, hint }) por etiqueta o ayuda; devuelve el id elegido o null.
// Si las opciones son personas (traen image), muestra su foto de Microsoft o sus iniciales (decisión 2026-11-07).
"use client";

import { PersonAvatar } from "@/components/app-shell/person-avatar";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxFilter,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";

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
};

// POR QUÉ: también se busca por el texto de ayuda (NIT, código de ciudad, nombre del área), que los
// placeholders ofrecen ("Nombre o NIT", "LP, SC o CB").
export function useCatalogFilter() {
  const { contains } = useComboboxFilter();
  return (option: CatalogOption, query: string) =>
    contains(option.label, query) ||
    (option.hint !== undefined && contains(option.hint, query));
}

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
  const filter = useCatalogFilter();

  return (
    <Combobox
      items={options}
      filter={filter}
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
      <ComboboxContent className="w-max max-w-[min(var(--available-width),32rem)]">
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
