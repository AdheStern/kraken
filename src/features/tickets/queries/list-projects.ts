// src/features/tickets/queries/list-projects.ts
// Proyectos visibles para el usuario con sus tickets abiertos y si puede gestionarlos (AGENTS.md §2.6, §2.9).
import type { SessionUser } from "@/server/authz/roles";
import { scopeProjectQuery } from "@/server/authz/scope-project-query";
import { canCreateTicket } from "@/server/authz/ticket-permissions";
import { prisma } from "@/server/db";
import type { ProjectView } from "../types";

const OPEN = { status: { notIn: ["CERRADO" as const, "CANCELADO" as const] } };
const toDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

export async function listProjects(user: SessionUser): Promise<ProjectView[]> {
  const projects = await prisma.project.findMany({
    where: scopeProjectQuery(user),
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      status: true,
      startsOn: true,
      endsOn: true,
      customer: { select: { name: true } },
      areas: { select: { area: { select: { id: true, code: true } } } },
      _count: { select: { tickets: { where: OPEN }, hourBags: true } },
    },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    customerName: p.customer.name,
    areaCodes: p.areas.map((a) => a.area.code),
    startsOn: toDate(p.startsOn),
    endsOn: toDate(p.endsOn),
    openTickets: p._count.tickets,
    bags: p._count.hourBags,
    canManage: canCreateTicket(user, {
      areaIds: p.areas.map((a) => a.area.id),
    }),
  }));
}
