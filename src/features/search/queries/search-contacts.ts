// src/features/search/queries/search-contacts.ts
// Grupo «Contactos» de la búsqueda global (decisión 2026-11-06): personas por nombre, correo, teléfono o cliente,
// hasta 5, cada una con su puesto actual. REGLA: pasa por scopeContactQuery (regla 7).
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { prisma } from "@/server/db";
import type { SearchGroup } from "../types";

const TAKE = 5;

export async function searchContacts(
  user: SessionUser,
  query: string,
): Promise<SearchGroup> {
  const text = { contains: query, mode: "insensitive" as const };
  const rows = await prisma.customerContact.findMany({
    where: {
      AND: [
        scopeContactQuery(user),
        { isActive: true },
        {
          OR: [
            { name: text },
            { email: text },
            { phone: text },
            { customer: { name: text } },
          ],
        },
      ],
    },
    orderBy: { name: "asc" },
    take: TAKE,
    select: {
      id: true,
      personId: true,
      name: true,
      position: true,
      customer: { select: { name: true } },
    },
  });
  return {
    label: "Contactos",
    items: rows.map((r) => ({
      id: r.id,
      label: r.name,
      hint: [r.position, r.customer.name].filter(Boolean).join(" · "),
      href: `/clientes/contactos/${r.personId}`,
    })),
  };
}
