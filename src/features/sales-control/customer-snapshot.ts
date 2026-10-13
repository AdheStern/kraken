// src/features/sales-control/customer-snapshot.ts
// Copia de los datos del cliente y del cliente final que se congela en cada versión (AGENTS.md §2.1, Snapshot).
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

type Contact = { name?: string; email?: string; phone?: string };

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
    address: customer.address,
    city: customer.city,
    country: customer.country,
  };
}

// POR QUÉ: el JSON guardado puede venir de versiones viejas; si no valida se trata como vacío, nunca rompe.
export function parseCustomerSnapshot(value: unknown): CustomerSnapshot | null {
  const parsed = customerSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
