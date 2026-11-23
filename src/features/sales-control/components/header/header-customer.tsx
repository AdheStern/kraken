// src/features/sales-control/components/header/header-customer.tsx
// Sección Cliente de la cabecera del CV: cliente con su NIT; el contacto se elige entre los registrados del cliente y
// prellena nombre, correo, teléfono y dirección (la de su sucursal o la general), que quedan editables (AGENTS.md
// §2.1, decisión 2026-11-11). El cliente final va en «Soporte y licencias» (header-end-customer.tsx).
"use client";

import { type UseFormReturn, useFormState, useWatch } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";
import type { CvContactOption } from "../../types";
import { toContactValues } from "./contact-values";
import { HeaderSection } from "./header-section";

export type HeaderCustomerInfo = {
  name: string;
  taxId: string;
  // Dirección general del catálogo: la del CV cuando el contacto no tiene sucursal.
  address: string;
};

type Props = {
  form: UseFormReturn<CvHeaderInput>;
  contacts: CvContactOption[];
  disabled: boolean;
  customer: HeaderCustomerInfo;
};

export function HeaderCustomer({ form, contacts, disabled, customer }: Props) {
  const { errors } = useFormState({ control: form.control });
  const { control, register, setValue } = form;
  const contactName = useWatch({ control, name: "contactName" });
  // POR QUÉ: la versión guarda la copia del contacto, no su id; el elegido se reconoce por el nombre.
  const chosen = contacts.find((c) => c.name === contactName.trim()) ?? null;

  function pickContact(contactId: string | null) {
    const values = toContactValues(
      contacts.find((c) => c.id === contactId),
      customer.address,
    );
    const dirty = { shouldDirty: true };
    setValue("contactName", values.name, dirty);
    setValue("contactEmail", values.email, dirty);
    setValue("contactPhone", values.phone, dirty);
    setValue("contactAddress", values.address, dirty);
  }

  return (
    <HeaderSection title="Cliente">
      <FormField
        label="Cliente"
        htmlFor="cv-customer"
        hint="Se fija al crear el CV."
        // POR QUÉ: la razón social suele ser larga; en una columna se cortaba.
        className="sm:col-span-2 lg:col-span-3"
      >
        <Input id="cv-customer" value={customer.name} readOnly disabled />
      </FormField>
      <FormField label="NIT" htmlFor="cv-customer-tax-id">
        <Input
          id="cv-customer-tax-id"
          value={customer.taxId || "Sin NIT"}
          readOnly
          disabled
        />
      </FormField>
      <FormField
        label="Contacto registrado"
        htmlFor="cv-contact"
        hint={
          contacts.length === 0
            ? "El cliente no tiene contactos: agrégalos en Administración → Clientes o escríbelo al lado."
            : "Elegirlo llena nombre, correo, teléfono y dirección; puedes corregirlos."
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
        label="Dirección"
        htmlFor="cv-contact-address"
        hint="La de la sucursal del contacto o, si no tiene, la dirección general del cliente; puedes corregirla."
        error={errors.contactAddress?.message}
        className="sm:col-span-2 lg:col-span-4"
      >
        <Input
          id="cv-contact-address"
          disabled={disabled}
          {...register("contactAddress")}
        />
      </FormField>
    </HeaderSection>
  );
}
