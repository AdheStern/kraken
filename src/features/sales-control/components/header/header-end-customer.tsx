// src/features/sales-control/components/header/header-end-customer.tsx
// Sección «Soporte y licencias» de la cabecera del CV: el cliente final y quién administra el soporte y las
// licencias. La cadena lo enlaza al contacto del cliente; rota, se elige otro (AGENTS.md §2.1, decisión 2026-11-16).
"use client";

import { Link2, Unlink2 } from "lucide-react";
import { Controller, type UseFormReturn, useWatch } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";
import type { CvContactOption, Option } from "../../types";
import { EndContactFields } from "./end-contact-fields";
import { HeaderSection } from "./header-section";
import { useEndCustomerContacts } from "./use-end-customer-contacts";

type Props = {
  form: UseFormReturn<CvHeaderInput>;
  customers: Option[];
  contacts: CvContactOption[];
  disabled: boolean;
  customerId: string;
};

export function HeaderEndCustomer({
  form,
  customers,
  contacts,
  disabled,
  customerId,
}: Props) {
  const { control, setValue, getValues } = form;
  const [endCustomerId, isLinked, contactName] = useWatch({
    control,
    name: ["endCustomerId", "endContactLinked", "contactName"],
  });
  const otherCustomerId =
    endCustomerId && endCustomerId !== customerId ? endCustomerId : null;
  const endContacts = useEndCustomerContacts(
    getValues("versionId"),
    otherCustomerId,
    contacts,
  );

  // REGLA: enlazar descarta el contacto propio; romper la cadena empieza vacío para elegir otro.
  function setLinked(linked: boolean) {
    const dirty = { shouldDirty: true };
    setValue("endContactLinked", linked, dirty);
    for (const field of [
      "endContactName",
      "endContactEmail",
      "endContactPhone",
      "endContactAddress",
    ] as const)
      setValue(field, "", dirty);
  }

  function pickEndCustomer(id: string | null) {
    setValue("endCustomerId", id, { shouldDirty: true });
    // POR QUÉ: el contacto del cliente no es de otra empresa; con otro cliente final la cadena se rompe sola.
    if (id && id !== customerId) setLinked(false);
  }

  return (
    <HeaderSection title="Soporte y licencias">
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
              onChange={pickEndCustomer}
              disabled={disabled}
              placeholder="Igual al cliente"
            />
          )}
        />
      </FormField>
      <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-4">
        <Button
          type="button"
          variant={isLinked ? "outline" : "secondary"}
          size="icon"
          aria-pressed={!isLinked}
          aria-label={
            isLinked
              ? "Usar otro contacto para soporte y licencias"
              : "Usar el mismo contacto del cliente"
          }
          title={isLinked ? "Romper la cadena" : "Volver a enlazar"}
          disabled={disabled}
          onClick={() => setLinked(!isLinked)}
          data-testid="cv-end-contact-chain"
        >
          {isLinked ? (
            <Link2 aria-hidden="true" />
          ) : (
            <Unlink2 aria-hidden="true" />
          )}
        </Button>
        <div className="grid gap-0.5 text-sm">
          <span className="font-medium">
            Contacto para administración de soporte y licencias
          </span>
          <span className="text-muted-foreground">
            {isLinked
              ? `Mismo contacto del cliente: ${contactName.trim() || "sin contacto"}.`
              : "Elige o escribe quién administra el soporte y las licencias; la cadena lo vuelve a enlazar."}
          </span>
        </div>
      </div>
      {!isLinked && (
        <EndContactFields
          form={form}
          contacts={endContacts.contacts}
          isLoading={endContacts.isLoading}
          disabled={disabled}
        />
      )}
    </HeaderSection>
  );
}
