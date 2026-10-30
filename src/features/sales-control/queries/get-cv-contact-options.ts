// src/features/sales-control/queries/get-cv-contact-options.ts
// Contactos activos del cliente de un CV, para elegir el contacto de la cabecera (AGENTS.md §2.1).
// LIMITACIÓN: sin alcance propio; el editor ya pasó la authz del CV y solo se piden los de su cliente.
import { prisma } from "@/server/db";
import type { CvContactOption } from "../types";

export async function getCvContactOptions(
  customerId: string,
): Promise<CvContactOption[]> {
  const contacts = await prisma.customerContact.findMany({
    where: { customerId, isActive: true },
    orderBy: { name: "asc" },
  });
  return contacts.map((c) => ({
    id: c.id,
    label: c.name,
    hint: c.position ?? undefined,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
  }));
}
