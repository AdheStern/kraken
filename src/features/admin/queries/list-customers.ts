// src/features/admin/queries/list-customers.ts
// Clientes del catálogo con búsqueda por razón social o NIT; los dados de baja van al final.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { CustomerRow } from "../types";

const LIMIT = 200;

export async function listCustomers(search: string): Promise<CustomerRow[]> {
  const q = search.trim();
  const rows = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { taxId: { contains: q } },
          ],
        }
      : {},
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: LIMIT,
    select: {
      id: true,
      name: true,
      taxId: true,
      city: true,
      isActive: true,
      _count: { select: { contacts: { where: { isActive: true } } } },
    },
  });
  return rows.map(({ _count, ...row }) => ({
    ...row,
    contactCount: _count.contacts,
  }));
}
