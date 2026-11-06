// src/features/admin/components/use-contact-save.ts
// Guardar un contacto con el aviso de duplicados (decisión 2026-11-06): al crear se busca primero si la persona ya
// existe; si existe se elige usarla (agregarle el puesto o transferirla) o crear otra persona.
"use client";

import { useState } from "react";
import type { ContactMatch } from "@/domain/customers/contact-matching";
import { findContactDuplicates } from "../actions/find-contact-duplicates";
import { transferCustomerContact } from "../actions/transfer-customer-contact";
import { upsertCustomerContact } from "../actions/upsert-customer-contact";
import { useAdminAction } from "./use-admin-action";

export type ContactForm = {
  name: string;
  position: string;
  email: string;
  phone: string;
  municipalityId: string | null;
  branchId: string | null;
  areaIds: string[];
  userIds: string[];
};

type Options = {
  customerId: string;
  contactId: string | null;
  onDone: () => void;
};

export function useContactSave({ customerId, contactId, onDone }: Options) {
  const { isPending, error, run } = useAdminAction();
  // null = aún no se buscó; [] = se buscó y se eligió crear otra persona.
  const [matches, setMatches] = useState<ContactMatch[] | null>(null);

  async function finish(ok: boolean) {
    if (!ok) return;
    setMatches(null);
    onDone();
  }

  async function save(form: ContactForm) {
    if (!contactId && matches === null) {
      const found = await findContactDuplicates({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
      });
      if (found.ok && found.data.length > 0) return setMatches(found.data);
    }
    await finish(
      await run(() =>
        upsertCustomerContact({ id: contactId, customerId, ...form }),
      ),
    );
  }

  async function pickMatch(match: ContactMatch, form: ContactForm) {
    const moves = match.isActive && match.customerId !== customerId;
    await finish(
      await run(() =>
        moves
          ? transferCustomerContact({
              fromContactId: match.contactId,
              customerId,
              reason: "",
              ...form,
            })
          : upsertCustomerContact({
              id: null,
              customerId,
              personId: match.personId,
              ...form,
            }),
      ),
    );
  }

  return {
    isPending,
    error,
    matches,
    save,
    pickMatch,
    createAnyway: (form: ContactForm) => {
      setMatches([]);
      return run(() =>
        upsertCustomerContact({ id: null, customerId, ...form }),
      ).then(finish);
    },
  };
}
