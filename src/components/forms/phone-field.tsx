// src/components/forms/phone-field.tsx
// Teléfono con selector de país (bandera y código; Bolivia por defecto) que separa el número en bloques al escribir
// o pegar. Entrega el valor listo para guardar: «+591 7123 4567» (formato en src/domain/customers/phone-format).
"use client";

import { useId, useRef, useState } from "react";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { PHONE_COUNTRIES } from "@/domain/customers/phone-countries";
import {
  caretAfterDigits,
  formatNationalPhone,
  OTHER_PHONE_COUNTRY,
  parsePhone,
  toStoredPhone,
} from "@/domain/customers/phone-format";

const COUNTRY_OPTIONS = [
  ...PHONE_COUNTRIES.map((c) => ({
    id: c.iso,
    label: `${c.flag} +${c.dialCode}`,
    hint: c.name,
  })),
  { id: OTHER_PHONE_COUNTRY, label: "Otro", hint: "Escribir tal cual" },
];

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
};

export function PhoneField({ label, value, onChange, ...props }: Props) {
  const ownId = useId();
  const id = props.id ?? ownId;
  const inputRef = useRef<HTMLInputElement>(null);
  // POR QUÉ: el país vive aparte del valor para no perderlo con el número vacío y para que «Otro» no se vuelva
  // Bolivia al escribir solo dígitos; un valor que llega de afuera (contacto elegido) trae su propio país.
  const [chosen, setChosen] = useState(() => parsePhone(value).country);
  const country =
    chosen !== OTHER_PHONE_COUNTRY && value.trim()
      ? parsePhone(value, chosen).country
      : chosen;
  const isOther = country === OTHER_PHONE_COUNTRY;
  const digits = isOther ? "" : parsePhone(value, country).national;
  const shown = isOther ? value : formatNationalPhone(country, digits);

  function changeCountry(next: string | null) {
    if (!next || next === country) return;
    setChosen(next);
    if (next === OTHER_PHONE_COUNTRY) return;
    const national = isOther ? value.replace(/\D/g, "") : digits;
    onChange(toStoredPhone({ country: next, national }));
  }

  function changeNumber(input: HTMLInputElement) {
    const typed = input.value;
    // Pegar «+54 11 …» elige el país; un código fuera de la lista pasa a «Otro», donde se escribe libre.
    if (!isOther && typed.trim().startsWith("+")) {
      const pasted = parsePhone(typed, country);
      setChosen(pasted.country);
      return onChange(toStoredPhone(pasted));
    }
    if (isOther) return onChange(typed);
    const caret = input.selectionStart ?? typed.length;
    let next = typed.replace(/\D/g, "");
    let caretDigits = typed.slice(0, caret).replace(/\D/g, "").length;
    // TRAMPA: borrar un espacio no quita dígitos y el formato lo repondría; se borra el dígito anterior.
    if (next === digits && typed.length < shown.length && caretDigits > 0) {
      next = next.slice(0, caretDigits - 1) + next.slice(caretDigits);
      caretDigits -= 1;
    }
    onChange(toStoredPhone({ country, national: next }));
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || document.activeElement !== el) return;
      const at = caretAfterDigits(el.value, caretDigits);
      el.setSelectionRange(at, at);
    });
  }

  return (
    <FormField
      label={label}
      htmlFor={id}
      error={props.error}
      className={props.className}
    >
      <div className="flex gap-2">
        <CatalogCombobox
          options={COUNTRY_OPTIONS}
          value={country}
          onChange={changeCountry}
          clearable={false}
          disabled={props.disabled}
          inputProps={{ "aria-label": `País de ${label.toLowerCase()}` }}
          className="h-9 w-32 shrink-0"
          contentClassName="min-w-72"
        />
        <Input
          ref={inputRef}
          id={id}
          type="tel"
          autoComplete="tel-national"
          value={shown}
          disabled={props.disabled}
          aria-invalid={props.error ? true : undefined}
          onChange={(event) => changeNumber(event.currentTarget)}
          placeholder={
            isOther
              ? "+49 30 1234567"
              : formatNationalPhone(country, "71234567")
          }
        />
      </div>
    </FormField>
  );
}
