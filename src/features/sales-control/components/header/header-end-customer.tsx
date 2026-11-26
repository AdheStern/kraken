// src/features/sales-control/components/header/header-end-customer.tsx
// Sección «Soporte y licencias» de la cabecera del CV: quién administra el soporte y las licencias. La cadena lo
// enlaza al contacto del cliente; rota, se elige otro (AGENTS.md §2.1, decisiones 2026-11-16 y 2026-11-26).
"use client";

import { Link2, Unlink2 } from "lucide-react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";
import type { CvContactOption } from "../../types";
import { EndContactFields } from "./end-contact-fields";
import { HeaderSection } from "./header-section";
import { useEndCustomerContacts } from "./use-end-customer-contacts";

type Props = {
  form: UseFormReturn<CvHeaderInput>;
  contacts: CvContactOption[];
  disabled: boolean;
  customerId: string;
};

export function HeaderEndCustomer({
  form,
  contacts,
  disabled,
  customerId,
}: Props) {
  const { control, setValue, getValues } = form;
  // POR QUÉ: el selector de cliente final está oculto por ahora (decisión 2026-11-26); un CV que ya tenía otro
  // conserva sus contactos para elegir.
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

  return (
    <HeaderSection title="Soporte y licencias">
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
