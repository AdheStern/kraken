// src/features/sales-control/queries/get-cv-form-options.ts
// Catálogos activos que necesitan los formularios del CV (ciudades, clientes, personas, clasificación).
import { prisma } from "@/server/db";
import type { CvFormOptions } from "../types";

export async function getCvFormOptions(): Promise<CvFormOptions> {
  const active = { isActive: true };
  const [cities, customers, technologies, serviceTypes, people] =
    await Promise.all([
      prisma.city.findMany({ where: active, orderBy: { code: "asc" } }),
      prisma.customer.findMany({ where: active, orderBy: { name: "asc" } }),
      prisma.technology.findMany({ where: active, orderBy: { name: "asc" } }),
      prisma.serviceType.findMany({ where: active, orderBy: { name: "asc" } }),
      prisma.userProfile.findMany({
        where: active,
        select: { userId: true, user: { select: { name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      }),
    ]);

  return {
    cities: cities.map((c) => ({ id: c.id, label: c.name, hint: c.code })),
    customers: customers.map((c) => ({
      id: c.id,
      label: c.name,
      hint: c.taxId ?? undefined,
    })),
    technologies: technologies.map((t) => ({ id: t.id, label: t.name })),
    serviceTypes: serviceTypes.map((s) => ({ id: s.id, label: s.name })),
    people: people.map((p) => ({
      id: p.userId,
      label: p.user.name,
      hint: p.user.email,
    })),
  };
}
