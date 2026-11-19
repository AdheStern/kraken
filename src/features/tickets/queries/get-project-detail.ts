// src/features/tickets/queries/get-project-detail.ts
// Cabecera de un proyecto visible para el usuario: cliente, áreas, fechas, estado y si puede gestionarlo
// (AGENTS.md §2.6, §2.9). Null si no existe o el usuario no lo ve (regla 7).
import { z } from "zod";
import type { SessionUser } from "@/server/authz/roles";
import { scopeProjectQuery } from "@/server/authz/scope-project-query";
import { canCreateTicket } from "@/server/authz/ticket-permissions";
import { prisma } from "@/server/db";
import type { ProjectDetailView } from "../types";

const toDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

export async function getProjectDetail(
  user: SessionUser,
  projectId: string,
): Promise<ProjectDetailView | null> {
  // TRAMPA: un id que no es uuid haría fallar la consulta en lugar de dar 404.
  if (!z.uuid().safeParse(projectId).success) return null;
  const project = await prisma.project.findFirst({
    where: { AND: [scopeProjectQuery(user), { id: projectId }] },
    select: {
      id: true,
      name: true,
      status: true,
      startsOn: true,
      endsOn: true,
      customer: { select: { id: true, name: true } },
      areas: { select: { area: { select: { id: true, code: true } } } },
    },
  });
  if (!project) return null;
  const areaIds = project.areas.map((a) => a.area.id);
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    customerId: project.customer.id,
    customerName: project.customer.name,
    areaIds,
    areaCodes: project.areas.map((a) => a.area.code).sort(),
    startsOn: toDate(project.startsOn),
    endsOn: toDate(project.endsOn),
    canManage: canCreateTicket(user, { areaIds }),
  };
}
