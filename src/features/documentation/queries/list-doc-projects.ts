// src/features/documentation/queries/list-doc-projects.ts
// Proyectos de documentación visibles, los más recientes primero, con búsqueda por nombre o cliente (§2.10).
import type { SessionUser } from "@/server/authz/roles";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { prisma } from "@/server/db";
import type { DocProjectSummary } from "../types";

const LIMIT = 200;

export async function listDocProjects(
  user: SessionUser,
  search: string,
): Promise<DocProjectSummary[]> {
  const q = search.trim();
  const rows = await prisma.docProject.findMany({
    where: {
      AND: [
        scopeDocProjectQuery(user),
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      customer: { select: { name: true } },
      owner: { select: { user: { select: { name: true } } } },
      technologies: { select: { technology: { select: { name: true } } } },
      _count: { select: { documents: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    customerName: row.customer.name,
    ownerName: row.owner.user.name,
    technologies: row.technologies.map((t) => t.technology.name).sort(),
    documentCount: row._count.documents,
    updatedAt: row.updatedAt.toISOString(),
  }));
}
