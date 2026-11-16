// src/features/sales-control/components/header/use-end-customer-contacts.ts
// Contactos para el contacto de soporte y licencias: los del cliente del CV o, con otro cliente final, los de ese
// cliente, que se piden al servidor al elegirlo (decisión 2026-11-16).
"use client";

import { useEffect, useState } from "react";
import { findCvContactOptions } from "../../actions/find-cv-contact-options";
import type { CvContactOption } from "../../types";

type Loaded = { customerId: string; contacts: CvContactOption[] };

export function useEndCustomerContacts(
  versionId: string,
  otherCustomerId: string | null,
  ownContacts: CvContactOption[],
): { contacts: CvContactOption[]; isLoading: boolean } {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const isCurrent = loaded?.customerId === otherCustomerId;

  useEffect(() => {
    if (!otherCustomerId || isCurrent) return;
    let isActive = true;
    findCvContactOptions({ versionId, customerId: otherCustomerId }).then(
      (result) => {
        if (!isActive) return;
        setLoaded({
          customerId: otherCustomerId,
          contacts: result.ok ? result.data : [],
        });
      },
    );
    return () => {
      isActive = false;
    };
  }, [versionId, otherCustomerId, isCurrent]);

  if (!otherCustomerId) return { contacts: ownContacts, isLoading: false };
  return {
    contacts: isCurrent ? (loaded?.contacts ?? []) : [],
    isLoading: !isCurrent,
  };
}
