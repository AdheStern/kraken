// src/features/admin/components/contact-row.tsx
// Un contacto del cliente: se lee en una línea, se edita en el lugar, se da de baja o se reactiva.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setCustomerContactActive } from "../actions/set-customer-contact-active";
import { upsertCustomerContact } from "../actions/upsert-customer-contact";
import type { CustomerContactView } from "../types";
import { ContactFields } from "./contact-fields";
import { useAdminAction } from "./use-admin-action";

type Props = { customerId: string; contact: CustomerContactView };

export function ContactRow({ customerId, contact }: Props) {
  const { isPending, error, run } = useAdminAction();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: contact.name,
    position: contact.position ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
  });
  const details = [contact.position, contact.email, contact.phone]
    .filter(Boolean)
    .join(" · ");
  const toggle = () =>
    run(() =>
      setCustomerContactActive({
        id: contact.id,
        isActive: !contact.isActive,
      }),
    );

  return (
    <li className="grid gap-1 px-4 py-2.5">
      {isEditing ? (
        <form
          className="grid gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await run(() =>
              upsertCustomerContact({ id: contact.id, customerId, ...draft }),
            );
            if (ok) setIsEditing(false);
          }}
        >
          <ContactFields
            draft={draft}
            onChange={setDraft}
            of={`de ${contact.name}`}
          />
          <Button type="submit" size="sm" className="h-9" disabled={isPending}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Guardar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setIsEditing(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 text-sm",
            !contact.isActive && "text-muted-foreground",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{contact.name}</p>
            {details && (
              <p className="truncate text-muted-foreground">{details}</p>
            )}
          </div>
          {contact.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              aria-label={`Editar ${contact.name}`}
            >
              Editar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            aria-label={`${contact.isActive ? "Dar de baja" : "Reactivar"} ${contact.name}`}
            onClick={toggle}
          >
            {contact.isActive ? "Dar de baja" : "Reactivar"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
