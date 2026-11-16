// src/features/sales-control/customer-snapshot.ts
// Copia de los datos del cliente y del cliente final que se congela en cada versión, con el contacto de cada uno:
// el del cliente final administra soporte y licencias (AGENTS.md §2.1, Snapshot, decisión 2026-11-16).
import { z } from "zod";

const partySchema = z.object({
  name: z.string(),
  taxId: z.string().nullable(),
  contactName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
});

export const customerSnapshotSchema = z.object({
  customer: partySchema,
  endCustomer: partySchema.nullable(),
});

export type CustomerParty = z.infer<typeof partySchema>;
export type CustomerSnapshot = z.infer<typeof customerSnapshotSchema>;

type CatalogCustomer = {
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

export type Contact = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export function toCustomerParty(
  customer: CatalogCustomer,
  contact: Contact = {},
): CustomerParty {
  return {
    name: customer.name,
    taxId: customer.taxId,
    contactName: contact.name || null,
    email: contact.email || customer.email,
    phone: contact.phone || customer.phone,
    address: contact.address || customer.address,
    city: customer.city,
    country: customer.country,
  };
}

type SnapshotInput = {
  customer: CatalogCustomer;
  // null: el cliente final es el mismo cliente.
  endCustomer: CatalogCustomer | null;
  contact: Contact;
  // null: enlazado, el contacto de soporte y licencias es el mismo del cliente.
  endContact: Contact | null;
};

// REGLA: enlazado y sin otro cliente final, endCustomer queda null y el Excel repite el cliente (§2.1).
export function toCustomerSnapshot({
  customer,
  endCustomer,
  contact,
  endContact,
}: SnapshotInput): CustomerSnapshot {
  const main = toCustomerParty(customer, contact);
  if (endContact === null)
    return {
      customer: main,
      endCustomer: endCustomer ? toCustomerParty(endCustomer, contact) : null,
    };
  return {
    customer: main,
    endCustomer: toCustomerParty(endCustomer ?? customer, endContact),
  };
}

const CONTACT_KEYS = ["contactName", "email", "phone", "address"] as const;

// POR QUÉ: la versión no guarda si la cadena estaba enlazada; lo está si el cliente final no tiene un contacto
// distinto del cliente.
export function isEndContactLinked(snapshot: CustomerSnapshot | null): boolean {
  const end = snapshot?.endCustomer;
  if (!snapshot || !end) return true;
  return CONTACT_KEYS.every((key) => end[key] === snapshot.customer[key]);
}

// POR QUÉ: el JSON guardado puede venir de versiones viejas; si no valida se trata como vacío, nunca rompe.
export function parseCustomerSnapshot(value: unknown): CustomerSnapshot | null {
  const parsed = customerSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
