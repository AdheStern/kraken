// src/features/sales-control/components/header/header-customer.tsx
// Sección Cliente de la cabecera del CV: el contacto se elige entre los registrados del cliente y prellena
// nombre, correo y teléfono, que quedan editables; y el cliente final (AGENTS.md §2.1).
"use client";

import { Controller, type UseFormReturn, useWatch } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";
import type { CvContactOption, Option } from "../../types";
import { HeaderSection } from "./header-section";

type Props = {
  form: UseFormReturn<CvHeaderInput>;
  customers: Option[];
  contacts: CvContactOption[];
  disabled: boolean;
  customerName: string;
};

export function HeaderCustomer({
  form,
  customers,
  contacts,
  disabled,
  customerName,
}: Props) {
  const { errors } = form.formState;
  const { control, register, setValue } = form;
  const contactName = useWatch({ control, name: "contactName" });
  // POR QUÉ: la versión guarda la copia del contacto, no su id; el elegido se reconoce por el nombre.
  const chosen = contacts.find((c) => c.name === contactName.trim()) ?? null;

  function pickContact(contactId: string | null) {
    const contact = contacts.find((c) => c.id === contactId);
    const dirty = { shouldDirty: true };
    setValue("contactName", contact?.name ?? "", dirty);
    setValue("contactEmail", contact?.email ?? "", dirty);
    setValue("contactPhone", contact?.phone ?? "", dirty);
  }

  return (
    <HeaderSection title="Cliente">
      <FormField
        label="Cliente"
        htmlFor="cv-customer"
        hint="Se fija al crear el CV."
      >
        <Input id="cv-customer" value={customerName} readOnly disabled />
      </FormField>
      <FormField
        label="Contacto registrado"
        htmlFor="cv-contact"
        hint={
          contacts.length === 0
            ? "El cliente no tiene contactos: agrégalos en Administración → Clientes o escríbelo al lado."
            : "Elegirlo llena nombre, correo y teléfono; puedes corregirlos."
        }
      >
        <CatalogCombobox
          id="cv-contact"
          options={contacts}
          value={chosen?.id ?? null}
          onChange={pickContact}
          disabled={disabled || contacts.length === 0}
          placeholder="Buscar contacto"
        />
      </FormField>
      <FormField
        label="Nombre del contacto"
        htmlFor="cv-contact-name"
        error={errors.contactName?.message}
      >
        <Input
          id="cv-contact-name"
          disabled={disabled}
          {...register("contactName")}
        />
      </FormField>
      <FormField
        label="Correo del contacto"
        htmlFor="cv-contact-email"
        error={errors.contactEmail?.message}
      >
        <Input
          id="cv-contact-email"
          type="email"
          disabled={disabled}
          {...register("contactEmail")}
        />
      </FormField>
      <FormField
        label="Teléfono del contacto"
        htmlFor="cv-contact-phone"
        error={errors.contactPhone?.message}
      >
        <Input
          id="cv-contact-phone"
          type="tel"
          disabled={disabled}
          {...register("contactPhone")}
        />
      </FormField>
      <FormField
        label="Cliente final"
        htmlFor="cv-end-customer"
        hint="Solo si DIMA vende a través de un tercero."
        className="sm:col-span-2 lg:col-span-3"
      >
        <Controller
          control={control}
          name="endCustomerId"
          render={({ field }) => (
            <CatalogCombobox
              id="cv-end-customer"
              options={customers}
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
              placeholder="Igual al cliente"
            />
          )}
        />
      </FormField>
    </HeaderSection>
  );
}
