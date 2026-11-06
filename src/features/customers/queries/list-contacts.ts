// src/features/customers/queries/list-contacts.ts
// Directorio de contactos de clientes (decisión 2026-11-06): busca por nombre, cargo, correo, teléfono, cliente o
// municipio, y filtra por cliente, área, responsable de DIMA y si siguen activos. REGLA: pasa por scopeContactQuery.

import {
  CONTACT_SELECT,
  toContactView,
} from "@/features/admin/queries/contact-view";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { prisma } from "@/server/db";
import type { ContactFilters, DirectoryContact } from "../types";

// POR QUÉ: en pantalla se pagina a 200; la exportación pide todos (sin tope).
export async function listContacts(
  user: SessionUser,
  filters: ContactFilters,
  take: number | undefined = 200,
): Promise<DirectoryContact[]> {
  const rows = await prisma.customerContact.findMany({
    where: { AND: [scopeContactQuery(user), toWhere(filters)] },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take,
    select: {
      ...CONTACT_SELECT,
      customer: { select: { id: true, name: true } },
    },
  });
  return rows.map((row) => ({
    ...toContactView(row),
    customerId: row.customer.id,
    customerName: row.customer.name,
  }));
}

function toWhere(f: ContactFilters): Prisma.CustomerContactWhereInput {
  const q = f.query.trim();
  const text = { contains: q, mode: "insensitive" as const };
  return {
    ...(f.onlyActive ? { isActive: true } : {}),
    ...(f.customerId ? { customerId: f.customerId } : {}),
    ...(f.areaId ? { areas: { some: { areaId: f.areaId } } } : {}),
    ...(f.userId ? { assignees: { some: { userId: f.userId } } } : {}),
    ...(q
      ? {
          OR: [
            { name: text },
            { position: text },
            { email: text },
            { phone: text },
            { customer: { name: text } },
            { municipality: { name: text } },
          ],
        }
      : {}),
  };
}
