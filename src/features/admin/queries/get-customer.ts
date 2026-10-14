// src/features/admin/queries/get-customer.ts
// Un cliente con todos sus contactos (activos primero), para su ficha en la administración.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { CustomerDetail } from "../types";

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
      isActive: true,
      contacts: {
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          position: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
    },
  });
  return customer;
}
