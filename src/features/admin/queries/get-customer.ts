// src/features/admin/queries/get-customer.ts
// Un cliente con todos sus contactos y sus sucursales (activos primero), para su ficha en la administración.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { CustomerDetail } from "../types";
import { CONTACT_SELECT, toContactView } from "./contact-view";

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      taxId: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      industryId: true,
      companyType: true,
      municipalityId: true,
      isActive: true,
      branches: {
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: {
          municipality: {
            select: { name: true, department: { select: { name: true } } },
          },
        },
      },
      contacts: {
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: CONTACT_SELECT,
      },
    },
  });
  if (!customer) return null;
  const { branches, contacts, ...rest } = customer;
  return {
    ...rest,
    contacts: contacts.map(toContactView),
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      municipalityId: b.municipalityId,
      municipalityLabel: b.municipality
        ? `${b.municipality.name} (${b.municipality.department.name})`
        : null,
      phone: b.phone,
      latitude: b.latitude?.toFixed(6) ?? null,
      longitude: b.longitude?.toFixed(6) ?? null,
      isActive: b.isActive,
    })),
  };
}
