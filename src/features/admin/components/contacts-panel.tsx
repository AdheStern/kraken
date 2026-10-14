// src/features/admin/components/contacts-panel.tsx
// Contactos de un cliente: alta en línea y la lista (activos primero).
"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";
import { upsertCustomerContact } from "../actions/upsert-customer-contact";
import type { CustomerContactView } from "../types";
import { ContactFields, EMPTY_CONTACT } from "./contact-fields";
import { ContactRow } from "./contact-row";
import { useAdminAction } from "./use-admin-action";

type Props = { customerId: string; contacts: CustomerContactView[] };

export function ContactsPanel({ customerId, contacts }: Props) {
  const { isPending, error, run } = useAdminAction();
  const [draft, setDraft] = useState(EMPTY_CONTACT);

  async function add() {
    const ok = await run(() =>
      upsertCustomerContact({ id: null, customerId, ...draft }),
    );
    if (ok) setDraft(EMPTY_CONTACT);
  }

  return (
    <div className="grid gap-3">
      <form
        className="kr-surface grid gap-2 rounded-xl p-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <ContactFields
          draft={draft}
          onChange={setDraft}
          of="del nuevo contacto"
        />
        <Button type="submit" size="sm" className="h-9" disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Agregar
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {contacts.length === 0 ? (
        <KrakenEmpty compact title="Este cliente no tiene contactos.">
          Agrega a la persona con quien se coordina la compra: su nombre, cargo,
          correo y teléfono quedan a mano para armar el CV.
        </KrakenEmpty>
      ) : (
        <ul className="kr-surface divide-y divide-border/60 rounded-xl">
          {contacts.map((c) => (
            <ContactRow key={c.id} customerId={customerId} contact={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
