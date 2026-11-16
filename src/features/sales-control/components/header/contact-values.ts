// src/features/sales-control/components/header/contact-values.ts
// Valores que un contacto del catálogo prellena en la cabecera del CV: nombre, correo, teléfono y la dirección de
// su sucursal o, sin ella, la indicada (AGENTS.md §2.1, decisión 2026-11-11).
import type { CvContactOption } from "../../types";

export type ContactValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export function toContactValues(
  contact: CvContactOption | undefined,
  fallbackAddress: string,
): ContactValues {
  return {
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    address: contact?.address || fallbackAddress,
  };
}
