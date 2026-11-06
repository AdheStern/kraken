// src/features/admin/components/contacts-panel.tsx
// Contactos de un cliente: los puestos activos y, aparte, los anteriores (quien se fue o se dio de baja), con el
// alta en un diálogo (decisión 2026-11-06).
"use client";

import { Plus } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Button } from "@/components/ui/button";
import type { ContactFormOptions, CustomerContactView } from "../types";
import { ContactDialog } from "./contact-dialog";
import { ContactRow } from "./contact-row";

type Props = {
  customerId: string;
  contacts: CustomerContactView[];
  options: ContactFormOptions;
};

export function ContactsPanel({ customerId, contacts, options }: Props) {
  const active = contacts.filter((c) => c.isActive);
  const former = contacts.filter((c) => !c.isActive);
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <ContactDialog
          customerId={customerId}
          options={options}
          trigger={
            <Button size="sm">
              <Plus aria-hidden="true" />
              Nuevo contacto
            </Button>
          }
        />
      </div>
      {active.length === 0 ? (
        <KrakenEmpty compact title="Este cliente no tiene contactos activos.">
          Agrega a la persona con quien se coordina la compra: su nombre, cargo,
          correo y teléfono quedan a mano para armar el CV.
        </KrakenEmpty>
      ) : (
        <List customerId={customerId} contacts={active} options={options} />
      )}
      {former.length > 0 && (
        <section className="grid gap-2" aria-labelledby="contactos-anteriores">
          <h3
            id="contactos-anteriores"
            className="text-xs font-medium text-muted-foreground uppercase"
          >
            Anteriores · {former.length}
          </h3>
          <List customerId={customerId} contacts={former} options={options} />
        </section>
      )}
    </div>
  );
}

function List({ customerId, contacts, options }: Props) {
  return (
    <ul className="kr-surface divide-y divide-border/60 rounded-xl">
      {contacts.map((c) => (
        <ContactRow
          key={c.id}
          customerId={customerId}
          contact={c}
          options={options}
        />
      ))}
    </ul>
  );
}
