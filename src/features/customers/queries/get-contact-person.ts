// src/features/customers/queries/get-contact-person.ts
// Una persona de contacto con todos sus puestos, actuales y anteriores: su historial de empresas (decisión
// 2026-11-06). REGLA: los puestos pasan por scopeContactQuery; sus datos personales solo los ve quien gestiona.
import {
  CONTACT_SELECT,
  toContactView,
} from "@/features/admin/queries/contact-view";
import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { prisma } from "@/server/db";
import type { ContactPersonView } from "../types";

export async function getContactPerson(
  user: SessionUser,
  personId: string,
): Promise<ContactPersonView | null> {
  const person = await prisma.contactPerson.findUnique({
    where: { id: personId },
    select: {
      id: true,
      name: true,
      personalEmail: true,
      personalPhone: true,
      positions: {
        where: scopeContactQuery(user),
        orderBy: [{ isActive: "desc" }, { startedOn: "desc" }],
        select: {
          ...CONTACT_SELECT,
          customer: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!person || person.positions.length === 0) return null;
  const manages = canManageCommercialCatalogs(user);
  return {
    id: person.id,
    name: person.name,
    personalEmail: manages ? person.personalEmail : null,
    personalPhone: manages ? person.personalPhone : null,
    positions: person.positions.map((row) => ({
      ...toContactView(row),
      customerId: row.customer.id,
      customerName: row.customer.name,
    })),
  };
}
