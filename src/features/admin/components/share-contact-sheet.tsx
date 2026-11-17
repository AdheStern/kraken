// src/features/admin/components/share-contact-sheet.tsx
// «Compartir»: la misma persona pasa a ser contacto de otras empresas con su cargo, correo y teléfono, sin duplicar
// su ficha. Las empresas del mismo grupo empresarial vienen marcadas; se puede elegir cualquier cliente
// (decisión 2026-11-16).
"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactElement, useState } from "react";
import { CatalogMultiCombobox } from "@/components/forms/catalog-multi-combobox";
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
import { shareCustomerContact } from "../actions/share-customer-contact";
import type { ContactFormOptions, CustomerContactView } from "../types";
import { useAdminAction } from "./use-admin-action";

type Props = {
  contact: CustomerContactView;
  customers: ContactFormOptions["customers"];
  currentCustomerId: string;
  trigger: ReactElement;
};

export function ShareContactSheet({
  contact,
  customers,
  currentCustomerId,
  trigger,
}: Props) {
  const { isPending, error, run } = useAdminAction();
  const [open, setOpen] = useState(false);
  const taken = new Set([
    currentCustomerId,
    ...contact.otherActive.map((s) => s.customerId),
  ]);
  const choices = customers.filter((c) => !taken.has(c.id));
  const groupId = customers.find((c) => c.id === currentCustomerId)?.groupId;
  const sisters = groupId ? choices.filter((c) => c.groupId === groupId) : [];
  const [customerIds, setCustomerIds] = useState(() =>
    sisters.map((c) => c.id),
  );

  async function share() {
    const ok = await run(() =>
      shareCustomerContact({ contactId: contact.id, customerIds }),
    );
    if (ok) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Compartir a {contact.name}</SheetTitle>
          <SheetDescription>
            También será contacto de las empresas que elijas, con el mismo
            cargo, correo, teléfono, áreas y responsables. Sigue siendo una sola
            ficha y su puesto aquí no cambia.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4">
          <FormField
            label="Empresas"
            htmlFor="share-customers"
            hint={
              sisters.length > 0
                ? "Vienen marcadas las del mismo grupo empresarial."
                : "Elige una o más empresas."
            }
          >
            <CatalogMultiCombobox
              id="share-customers"
              options={choices}
              value={customerIds}
              onChange={setCustomerIds}
              placeholder="Nombre o NIT"
            />
          </FormField>
          {contact.otherActive.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Ya es contacto de:{" "}
              {contact.otherActive.map((s) => s.customerName).join(", ")}.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="px-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <SheetFooter>
          <Button
            onClick={share}
            disabled={isPending || customerIds.length === 0}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Compartir
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
