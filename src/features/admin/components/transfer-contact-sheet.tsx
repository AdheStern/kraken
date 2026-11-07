// src/features/admin/components/transfer-contact-sheet.tsx
// «Transferir a otra empresa»: la persona deja este cliente (hoy, con el motivo) y empieza en otro con su nuevo
// cargo, correo y teléfono; sus áreas, responsables y municipio pasan igual (decisión 2026-11-06).
"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactElement, useState } from "react";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { transferCustomerContact } from "../actions/transfer-customer-contact";
import type { ContactFormOptions, CustomerContactView } from "../types";
import { LabeledInput } from "./labeled-input";
import { useAdminAction } from "./use-admin-action";

type Props = {
  contact: CustomerContactView;
  customers: ContactFormOptions["customers"];
  currentCustomerId: string;
  trigger: ReactElement;
};

const FIELDS = [
  ["position", "Nuevo cargo"],
  ["email", "Nuevo correo"],
  ["phone", "Nuevo teléfono"],
  ["reason", "Motivo (opcional: «Pasó a …»)"],
] as const;

export function TransferContactSheet({
  contact,
  customers,
  currentCustomerId,
  trigger,
}: Props) {
  const { isPending, error, run } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    position: contact.position ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    reason: "",
  });

  async function transfer() {
    if (!customerId) return;
    const ok = await run(() =>
      transferCustomerContact({
        fromContactId: contact.id,
        customerId,
        name: contact.name,
        municipalityId: contact.municipalityId,
        areaIds: contact.areaIds,
        userIds: contact.userIds,
        ...draft,
      }),
    );
    if (ok) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Transferir a {contact.name}</SheetTitle>
          <SheetDescription>
            Su puesto aquí queda cerrado con fecha de hoy y su historial se
            conserva en su ficha.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4 sm:grid-cols-2">
          <FormField
            label="Nueva empresa"
            htmlFor="transfer-customer"
            className="sm:col-span-2"
          >
            <CatalogCombobox
              id="transfer-customer"
              options={customers.filter((c) => c.id !== currentCustomerId)}
              value={customerId}
              onChange={setCustomerId}
              placeholder="Nombre o NIT"
            />
          </FormField>
          {FIELDS.map(([key, label]) => (
            <LabeledInput
              key={key}
              label={label}
              value={draft[key]}
              onChange={(value) => setDraft({ ...draft, [key]: value })}
              className={key === "reason" ? "sm:col-span-2" : undefined}
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="px-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <SheetFooter>
          <Button onClick={transfer} disabled={isPending || !customerId}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Transferir
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
