// src/features/admin/queries/list-customer-groups.ts
// Grupos empresariales con sus empresas (pestaña «Grupos» de /clientes): la búsqueda encuentra el grupo por su
// nombre o por el de una de sus empresas, y siempre trae el grupo completo.
// LIMITACIÓN: sin alcance por usuario, como list-customers: el catálogo de clientes es visible para todo el personal
// (§2.9) y aquí solo se cuentan contactos, no se muestran.
import { prisma } from "@/server/db";

const LIMIT = 100;

export type CustomerGroupRow = {
  id: string;
  name: string;
  members: {
    id: string;
    name: string;
    isActive: boolean;
    contactCount: number;
  }[];
};

export async function listCustomerGroups(
  search: string,
): Promise<CustomerGroupRow[]> {
  const q = search.trim();
  const rows = await prisma.customerGroup.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            {
              customers: {
                some: { name: { contains: q, mode: "insensitive" } },
              },
            },
          ],
        }
      : {},
    orderBy: { name: "asc" },
    take: LIMIT,
    select: {
      id: true,
      name: true,
      customers: {
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: { select: { contacts: { where: { isActive: true } } } },
        },
      },
    },
  });
  return rows.map(({ customers, ...group }) => ({
    ...group,
    members: customers.map(({ _count, ...c }) => ({
      ...c,
      contactCount: _count.contacts,
    })),
  }));
}
