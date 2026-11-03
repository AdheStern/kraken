// src/features/admin/queries/list-portal-customers.ts
// Clientes activos para elegir la empresa de una cuenta del portal (AGENTS.md §2.11).
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem.
import type { CatalogOption } from "@/components/forms/catalog-combobox";
import { prisma } from "@/server/db";

export async function listPortalCustomers(): Promise<CatalogOption[]> {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, taxId: true },
  });
  return customers.map((c) => ({
    id: c.id,
    label: c.name,
    hint: c.taxId ?? undefined,
  }));
}
