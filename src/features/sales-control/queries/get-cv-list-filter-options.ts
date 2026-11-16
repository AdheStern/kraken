// src/features/sales-control/queries/get-cv-list-filter-options.ts
// Ciudades y áreas para los filtros del listado de CV (catálogos sin montos; incluye las dadas de baja, que
// pueden tener CV).
import { prisma } from "@/server/db";
import type { CvListFilterOptions } from "../types";

export async function getCvListFilterOptions(): Promise<CvListFilterOptions> {
  const byCode = { orderBy: { code: "asc" as const } };
  const [cities, areas] = await Promise.all([
    prisma.city.findMany(byCode),
    prisma.area.findMany(byCode),
  ]);
  return {
    cities: cities.map((c) => ({ id: c.id, label: c.name, hint: c.code })),
    areas: areas.map((a) => ({ id: a.id, label: a.code, hint: a.name })),
  };
}
