// src/features/documentation/queries/get-doc-project.ts
// Un proyecto de documentación con su cabecera lista para editar (AGENTS.md §2.10); null si no existe o no se ve.
import { z } from "zod";
import type { SessionUser } from "@/server/authz/roles";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { prisma } from "@/server/db";
import type { DocProjectDetail } from "../types";

export async function getDocProject(
  user: SessionUser,
  projectId: string,
): Promise<DocProjectDetail | null> {
  if (!z.uuid().safeParse(projectId).success) return null;
  const row = await prisma.docProject.findFirst({
    where: { AND: [{ id: projectId }, scopeDocProjectQuery(user)] },
    include: {
      customer: { select: { name: true } },
      owner: { select: { user: { select: { name: true } } } },
      technologies: {
        select: { technologyId: true, technology: { select: { name: true } } },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    customerName: row.customer.name,
    ownerName: row.owner.user.name,
    technologies: row.technologies.map((t) => t.technology.name).sort(),
    header: {
      projectId: row.id,
      name: row.name,
      customerId: row.customerId,
      contactId: row.contactId,
      contactName: row.contactName ?? "",
      contactEmail: row.contactEmail ?? "",
      contactPhone: row.contactPhone ?? "",
      technologyIds: row.technologies.map((t) => t.technologyId),
      ownerId: row.ownerId,
    },
  };
}
