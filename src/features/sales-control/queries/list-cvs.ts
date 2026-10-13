// src/features/sales-control/queries/list-cvs.ts
// Listado de CV visibles para el usuario, con su versión más reciente (AGENTS.md §2.9, regla 7).
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { Prisma } from "@/generated/prisma/client";
import type { CvVersionStatus } from "@/generated/prisma/enums";
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
      city: { select: { code: true } },
      customer: { select: { name: true } },
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        select: {
          number: true,
          title: true,
          status: true,
          totalSaleUsd: true,
          updatedAt: true,
        },
      },
    },
  });

  return cvs.flatMap((cv) => {
    const latest = cv.versions[0];
    if (!latest) return [];
    return [
      {
        id: cv.id,
        code: cv.code,
        versionLabel: toCvVersionLabel(cv.code, latest.number),
        title: latest.title,
        customerName: cv.customer.name,
        cityCode: cv.city.code,
        status: latest.status,
        totalSaleUsd: latest.totalSaleUsd.toFixed(2),
        updatedAt: latest.updatedAt.toISOString(),
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
