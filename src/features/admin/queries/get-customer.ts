// src/features/admin/queries/get-customer.ts
// Un cliente con sus sucursales y los contactos que el usuario ve (activos primero), para su ficha.
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { prisma } from "@/server/db";
import type { CustomerDetail } from "../types";
import {
  CONTACT_SELECT,
  siblingSelect,
  toContactView,
  toSiblings,
} from "./contact-view";

export async function getCustomer(
  user: SessionUser,
  id: string,
): Promise<CustomerDetail | null> {
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
      tenant: true,
      notes: true,
      industryId: true,
      companyType: true,
      municipalityId: true,
      groupId: true,
      group: {
        select: {
          name: true,
          customers: {
            where: { id: { not: id } },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          },
        },
      },
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
        where: scopeContactQuery(user),
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: { ...CONTACT_SELECT, ...siblingSelect(user) },
      },
    },
  });
  if (!customer) return null;
  const { branches, contacts, group, ...rest } = customer;
  return {
    ...rest,
    group: group ? { name: group.name, siblings: group.customers } : null,
    contacts: contacts.map((c) => toContactView(c, toSiblings(c))),
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
