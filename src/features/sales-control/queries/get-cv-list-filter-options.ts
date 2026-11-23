// src/features/sales-control/queries/get-cv-list-filter-options.ts
// Ciudades, áreas y vendedores para los filtros del listado de CV (sin montos; incluye catálogos dados de baja,
// que pueden tener CV). Los vendedores son los de algún CV que el usuario ve (regla 7).
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma } from "@/server/db";
import type { CvListFilterOptions } from "../types";

export async function getCvListFilterOptions(
  user: SessionUser,
): Promise<CvListFilterOptions> {
  const byCode = { orderBy: { code: "asc" as const } };
  const [cities, areas, sellers] = await Promise.all([
    prisma.city.findMany(byCode),
    prisma.area.findMany(byCode),
    prisma.userProfile.findMany({
      where: {
        cvVersionsSold: { some: { version: { cv: scopeCvQuery(user) } } },
      },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  return {
    cities: cities.map((c) => ({ id: c.id, label: c.name, hint: c.code })),
    areas: areas.map((a) => ({ id: a.id, label: a.code, hint: a.name })),
    sellers: sellers.map((s) => ({ id: s.userId, label: s.user.name })),
  };
}
