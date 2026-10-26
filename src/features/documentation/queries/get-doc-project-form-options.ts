// src/features/documentation/queries/get-doc-project-form-options.ts
// Catálogos activos de la cabecera de un proyecto de documentación: clientes y sus contactos, tecnologías y
// personas (AGENTS.md §2.10).
// LIMITACIÓN: sin alcance por usuario; son catálogos que cualquier usuario con rol elige en el formulario.
import { prisma } from "@/server/db";
import type { DocProjectFormOptions } from "../types";

export async function getDocProjectFormOptions(): Promise<DocProjectFormOptions> {
  const active = { isActive: true };
  const [customers, contacts, technologies, people] = await Promise.all([
    prisma.customer.findMany({ where: active, orderBy: { name: "asc" } }),
    prisma.customerContact.findMany({
      where: { ...active, customer: active },
      orderBy: { name: "asc" },
    }),
    prisma.technology.findMany({ where: active, orderBy: { name: "asc" } }),
    prisma.userProfile.findMany({
      where: active,
      select: { userId: true, user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  return {
    customers: customers.map((c) => ({
      id: c.id,
      label: c.name,
      hint: c.taxId ?? undefined,
    })),
    contacts: contacts.map((c) => ({
      id: c.id,
      label: c.name,
      hint: c.position ?? undefined,
      customerId: c.customerId,
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
    })),
    technologies: technologies.map((t) => ({ id: t.id, label: t.name })),
    people: people.map((p) => ({
      id: p.userId,
      label: p.user.name,
      hint: p.user.email,
    })),
  };
}
