// src/features/sales-control/components/header/end-contact-fields.tsx
// Campos del contacto de soporte y licencias con la cadena rota: elegirlo del catálogo prellena nombre, correo,
// teléfono y dirección, que quedan editables (AGENTS.md §2.1, decisión 2026-11-16).
"use client";

import {
  Controller,
  type UseFormReturn,
  useFormState,
  useWatch,
} from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { PhoneField } from "@/components/forms/phone-field";
import { Input } from "@/components/ui/input";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";
import type { CvContactOption } from "../../types";
import { toContactValues } from "./contact-values";

type Props = {
  form: UseFormReturn<CvHeaderInput>;
  contacts: CvContactOption[];
  isLoading: boolean;
  disabled: boolean;
};

export function EndContactFields({
  form,
  contacts,
  isLoading,
  disabled,
}: Props) {
  const { register, setValue, control } = form;
  const { errors } = useFormState({ control: form.control });
  const name = useWatch({ control, name: "endContactName" });
  // POR QUÉ: la versión guarda la copia del contacto, no su id; el elegido se reconoce por el nombre.
  const chosen = contacts.find((c) => c.name === name.trim()) ?? null;

  function pick(contactId: string | null) {
    // POR QUÉ: sin dirección de sucursal queda vacía y el servidor pone la general del cliente final.
    const values = toContactValues(
      contacts.find((c) => c.id === contactId),
      "",
    );
    const dirty = { shouldDirty: true };
    setValue("endContactName", values.name, dirty);
    setValue("endContactEmail", values.email, dirty);
    setValue("endContactPhone", values.phone, dirty);
    setValue("endContactAddress", values.address, dirty);
  }

  const text = (
    field: "endContactName" | "endContactAddress",
    label: string,
    className?: string,
  ) => (
    <FormField
      label={label}
      htmlFor={`cv-${field}`}
      error={errors[field]?.message}
      className={className}
    >
      <Input id={`cv-${field}`} disabled={disabled} {...register(field)} />
    </FormField>
  );

  return (
    <>
      <FormField
        label="Contacto registrado"
        htmlFor="cv-end-contact"
        hint={
          isLoading
            ? "Cargando los contactos del cliente final…"
            : contacts.length === 0
              ? "Sin contactos en el catálogo: escríbelo al lado."
              : "Elegirlo llena nombre, correo, teléfono y dirección."
        }
      >
        <CatalogCombobox
          id="cv-end-contact"
          options={contacts}
          value={chosen?.id ?? null}
          onChange={pick}
          disabled={disabled || isLoading || contacts.length === 0}
          placeholder="Buscar contacto"
        />
      </FormField>
      {text("endContactName", "Nombre del contacto")}
      <FormField
        label="Correo del contacto"
        htmlFor="cv-endContactEmail"
        error={errors.endContactEmail?.message}
      >
        <Input
          id="cv-endContactEmail"
          type="email"
          disabled={disabled}
          {...register("endContactEmail")}
        />
      </FormField>
      <Controller
        control={form.control}
        name="endContactPhone"
        render={({ field }) => (
          <PhoneField
            id="cv-endContactPhone"
            label="Teléfono del contacto"
            value={field.value ?? ""}
            onChange={field.onChange}
            disabled={disabled}
            error={errors.endContactPhone?.message}
          />
        )}
      />
      {text("endContactAddress", "Dirección", "sm:col-span-2 lg:col-span-4")}
    </>
  );
}
