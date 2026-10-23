// src/features/dashboards/queries/get-filter-options.ts
// Opciones de la barra de filtros de los tableros: las áreas que el usuario puede elegir y las ciudades
// (AGENTS.md §6, §2.9 "Tableros"). Un área fuera de sus opciones se ignora en la página.
import {
  areaIdsWithRole,
  hasRole,
  type SessionUser,
} from "@/server/authz/roles";
import { prisma } from "@/server/db";

export type FilterOption = { id: string; label: string };

export type FilterOptions = { areas: FilterOption[]; cities: FilterOption[] };

// REGLA: GG y Administración eligen cualquier área; gerente y coordinador, las suyas; el resto ya ve solo lo
// suyo y no filtra por área.
export async function getFilterOptions(
  user: SessionUser,
): Promise<FilterOptions> {
  const seesAll =
    hasRole(user, "GERENTE_GENERAL") || hasRole(user, "ADMINISTRACION");
  const ownAreaIds = [
    ...areaIdsWithRole(user, "GERENTE_AREA"),
    ...areaIdsWithRole(user, "COORDINADOR_SOPORTE"),
  ];
  const [areas, cities] = await Promise.all([
    seesAll || ownAreaIds.length > 0
      ? prisma.area.findMany({
          where: {
            isActive: true,
            ...(seesAll ? {} : { id: { in: ownAreaIds } }),
          },
          select: { id: true, code: true },
          orderBy: { code: "asc" },
        })
      : [],
    prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    areas: areas.map((a) => ({ id: a.id, label: a.code })),
    cities: cities.map((c) => ({ id: c.id, label: c.name })),
  };
}
