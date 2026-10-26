// src/features/documentation/components/doc-project-fields.tsx
// Campos de la cabecera de un proyecto de documentación: nombre, cliente, contacto, tecnologías y encargado.
// El contacto del catálogo prellena nombre, correo y teléfono, que quedan editables (AGENTS.md §2.10).
"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { CatalogMultiCombobox } from "@/components/forms/catalog-multi-combobox";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { DocProjectInput } from "../schemas/doc-project-schema";
import type { DocProjectFormOptions } from "../types";

type Props = {
  form: UseFormReturn<DocProjectInput>;
  options: DocProjectFormOptions;
  idPrefix: string;
};

export function DocProjectFields({ form, options, idPrefix }: Props) {
  const { errors } = form.formState;
  const id = (name: string) => `${idPrefix}-${name}`;
  const customerId = form.watch("customerId");
  const contacts = options.contacts.filter((c) => c.customerId === customerId);

  function pickContact(contactId: string | null) {
    form.setValue("contactId", contactId);
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    form.setValue("contactName", contact.name);
    form.setValue("contactEmail", contact.email);
    form.setValue("contactPhone", contact.phone);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Nombre del proyecto"
        htmlFor={id("name")}
        error={errors.name?.message}
        className="sm:col-span-2"
      >
        <Input
          id={id("name")}
          placeholder="Implementación SD-WAN sucursales"
          {...form.register("name")}
        />
      </FormField>
      <FormField
        label="Cliente"
        htmlFor={id("customer")}
        error={errors.customerId?.message}
      >
        <Controller
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <CatalogCombobox
              id={id("customer")}
              options={options.customers}
              value={field.value || null}
              onChange={(value) => {
                field.onChange(value ?? "");
                form.setValue("contactId", null);
              }}
              invalid={!!errors.customerId}
              placeholder="Nombre o NIT"
            />
          )}
        />
      </FormField>
      <FormField
        label="Encargado"
        htmlFor={id("owner")}
        error={errors.ownerId?.message}
      >
        <Controller
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <CatalogCombobox
              id={id("owner")}
              options={options.people}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? "")}
              invalid={!!errors.ownerId}
              placeholder="Persona de DIMA"
            />
          )}
        />
      </FormField>
      <FormField
        label="Tecnologías"
        htmlFor={id("technologies")}
        className="sm:col-span-2"
      >
        <Controller
          control={form.control}
          name="technologyIds"
          render={({ field }) => (
            <CatalogMultiCombobox
              id={id("technologies")}
              options={options.technologies}
              value={field.value}
              onChange={field.onChange}
              placeholder="Cisco, Fortinet…"
            />
          )}
        />
      </FormField>
      <FormField
        label="Contacto del cliente"
        htmlFor={id("contact")}
        hint={
          customerId && contacts.length === 0
            ? "Este cliente no tiene contactos en el catálogo; escríbelo abajo."
            : "Elegirlo llena los datos de abajo; puedes corregirlos."
        }
        className="sm:col-span-2"
      >
        <Controller
          control={form.control}
          name="contactId"
          render={({ field }) => (
            <CatalogCombobox
              id={id("contact")}
              options={contacts}
              value={field.value}
              onChange={pickContact}
              disabled={!customerId}
              placeholder={customerId ? "Buscar contacto" : "Elige el cliente"}
            />
          )}
        />
      </FormField>
      <FormField label="Nombre del contacto" htmlFor={id("contact-name")}>
        <Input id={id("contact-name")} {...form.register("contactName")} />
      </FormField>
      <FormField
        label="Correo"
        htmlFor={id("contact-email")}
        error={errors.contactEmail?.message}
      >
        <Input
          id={id("contact-email")}
          type="email"
          {...form.register("contactEmail")}
        />
      </FormField>
      <FormField label="Teléfono" htmlFor={id("contact-phone")}>
        <Input
          id={id("contact-phone")}
          inputMode="tel"
          {...form.register("contactPhone")}
        />
      </FormField>
    </div>
  );
}
