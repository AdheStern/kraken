// src/features/sales-control/queries/list-cvs.ts
// Listado de CV visibles para el usuario, con su versión más reciente, sus áreas, sus vendedores y su costo
// total solo si el usuario puede ver costos de ese CV (AGENTS.md §2.9, reglas 7 y 12).
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { Prisma } from "@/generated/prisma/client";
import type { CvVersionStatus } from "@/generated/prisma/enums";
import {
  type CvAccessFacts,
  canSeeCvCosts,
} from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma } from "@/server/db";
import type { CvListRow } from "../types";

export type CvListFilters = {
  search?: string;
  status?: CvVersionStatus;
};

const PAGE_SIZE = 100;

export async function listCvs(
  user: SessionUser,
  filters: CvListFilters,
): Promise<CvListRow[]> {
  const where: Prisma.CvWhereInput = {
    AND: [
      scopeCvQuery(user),
      filters.search ? matchesSearch(filters.search) : {},
      filters.status ? { versions: { some: { status: filters.status } } } : {},
    ],
  };
  const cvs = await prisma.cv.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      code: true,
      createdById: true,
      isOpeningBalance: true,
      city: { select: { code: true } },
      customer: { select: { name: true } },
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        select: {
          number: true,
          title: true,
          status: true,
          totalCostUsd: true,
          totalSaleUsd: true,
          updatedAt: true,
          // REGLA: las áreas del CV son la unión de las áreas de sus líneas (§2.1).
          lines: {
            where: { kind: "ITEM", areaId: { not: null } },
            distinct: ["areaId"],
            select: { areaId: true, area: { select: { code: true } } },
          },
          sellers: {
            select: {
              user: {
                select: {
                  userId: true,
                  user: { select: { name: true, image: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return cvs.flatMap((cv) => {
    const latest = cv.versions[0];
    if (!latest) return [];
    const access: CvAccessFacts = {
      createdById: cv.createdById,
      sellerIds: latest.sellers.map(({ user }) => user.userId),
      lineAreaIds: latest.lines.flatMap((l) => (l.areaId ? [l.areaId] : [])),
      // REGLA: Administración ve costos solo de lo aprobado, versión por versión (§2.9).
      isApprovedVersion:
        latest.status === "APROBADA" || latest.status === "REEMPLAZADA",
    };
    return [
      {
        id: cv.id,
        code: cv.code,
        isOpeningBalance: cv.isOpeningBalance,
        versionLabel: toCvVersionLabel(cv.code, latest.number),
        title: latest.title,
        customerName: cv.customer.name,
        cityCode: cv.city.code,
        status: latest.status,
        // REGLA: sin permiso de costos el monto no sale del servidor (regla 12).
        totalCostUsd: canSeeCvCosts(user, access)
          ? latest.totalCostUsd.toFixed(2)
          : null,
        totalSaleUsd: latest.totalSaleUsd.toFixed(2),
        updatedAt: latest.updatedAt.toISOString(),
        areas: latest.lines
          .flatMap((line) => (line.area ? [line.area.code] : []))
          .sort(),
        sellers: latest.sellers
          .map(({ user }) => ({
            id: user.userId,
            name: user.user.name,
            image: user.user.image,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      },
    ];
  });
}

function matchesSearch(search: string): Prisma.CvWhereInput {
  const contains = { contains: search.trim(), mode: "insensitive" as const };
  return {
    OR: [
      { code: contains },
      { customer: { name: contains } },
      { versions: { some: { title: contains } } },
    ],
  };
}
