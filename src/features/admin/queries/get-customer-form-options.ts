// src/features/admin/queries/get-customer-form-options.ts
// Opciones de la ficha del cliente: rubros activos, grupos empresariales y municipios de Bolivia con su departamento
// (decisiones 2026-11-06 y 2026-11-16). LIMITACIÓN: sin alcance por usuario; son catálogos y la página exige canManageCommercialCatalogs.
import { prisma } from "@/server/db";
import type { CustomerFormOptions } from "../types";

export async function getCustomerFormOptions(): Promise<CustomerFormOptions> {
  const [industries, groups, municipalities] = await Promise.all([
    prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.customerGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.municipality.findMany({
      where: { isActive: true },
      orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, department: { select: { name: true } } },
    }),
  ]);
  return {
    industries: industries.map((i) => ({ id: i.id, label: i.name })),
    groups: groups.map((g) => ({ id: g.id, label: g.name })),
    municipalities: municipalities.map((m) => ({
      id: m.id,
      label: m.name,
      hint: m.department.name,
    })),
  };
}
