// src/features/sales-control/queries/cv-list-where.ts
// Condición del listado de CV: el alcance del usuario más la búsqueda y los filtros elegidos (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import type { CvVersionStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";

export type CvListFilters = {
  search?: string;
  status?: CvVersionStatus;
  cityId?: string;
  areaId?: string;
};

export function cvListWhere(
  user: SessionUser,
  filters: CvListFilters,
): Prisma.CvWhereInput {
  return {
    AND: [
      scopeCvQuery(user),
      filters.search ? matchesSearch(filters.search) : {},
      filters.status ? { versions: { some: { status: filters.status } } } : {},
      filters.cityId ? { cityId: filters.cityId } : {},
      // POR QUÉ: Prisma no filtra por la última versión; estado y área acotan aquí por cualquier versión y
      // quien llama se queda con los CV cuya última versión cumple (decisión 2026-11-16).
      filters.areaId
        ? {
            versions: {
              some: {
                lines: { some: { kind: "ITEM", areaId: filters.areaId } },
              },
            },
          }
        : {},
    ],
  };
}

function matchesSearch(search: string): Prisma.CvWhereInput {
  const contains = { contains: search.trim(), mode: "insensitive" as const };
  return {
    OR: [
      { code: contains },
      { customer: { name: contains } },
      { customer: { acronym: contains } },
      { versions: { some: { title: contains } } },
    ],
  };
}
