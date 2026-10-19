// src/features/tickets/queries/get-ticket-detail.ts
// Un ticket con su cabecera, permisos, subtareas, comentarios e historial; null si no existe o no es visible
// para el usuario (AGENTS.md §2.9, §5 "Detalle del ticket").
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import type { Person, TicketDetail } from "../types";
import { listTicketEngineers } from "./list-ticket-engineers";
import { toTicketPermissions } from "./ticket-permissions-view";

const PERSON = {
  select: { userId: true, user: { select: { name: true, image: true } } },
};

export async function getTicketDetail(
  user: SessionUser,
  ticketId: string,
): Promise<TicketDetail | null> {
  const t = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, scopeTicketQuery(user)] },
    include: {
      customer: { select: { name: true } },
      city: { select: { name: true } },
      project: { select: { name: true } },
      areas: { select: { area: { select: { id: true, code: true } } } },
      owner: PERSON,
      subtasks: {
        orderBy: { createdAt: "asc" },
        include: { assignee: PERSON },
      },
      comments: { orderBy: { createdAt: "desc" }, include: { author: PERSON } },
      statusEvents: {
        orderBy: { occurredAt: "desc" },
        include: { actor: { select: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!t) return null;
  const areaIds = t.areas.map((a) => a.area.id);
  const access = {
    areaIds,
    ownerId: t.ownerId,
    subtaskAssigneeIds: t.subtasks.flatMap((s) =>
      s.assigneeId ? [s.assigneeId] : [],
    ),
  };
  return {
    ticket: {
      id: t.id,
      number: t.number,
      title: t.title,
      description: t.description,
      kind: t.kind,
      status: t.status,
      priority: t.priority,
      slaModality: t.slaModality,
      customerId: t.customerId,
      customerName: t.customer.name,
      cityName: t.city.name,
      projectName: t.project?.name ?? null,
      areas: t.areas.map((a) => a.area),
      owner: t.owner ? toPerson(t.owner) : null,
      createdAt: t.createdAt.toISOString(),
      firstResponseAt: t.firstResponseAt?.toISOString() ?? null,
      resolvedAt: t.resolvedAt?.toISOString() ?? null,
      closedAt: t.closedAt?.toISOString() ?? null,
    },
    permissions: toTicketPermissions(user, access, t.status),
    subtasks: t.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      assignee: s.assignee ? toPerson(s.assignee) : null,
      completedAt: s.completedAt?.toISOString() ?? null,
    })),
    comments: t.comments.map((c) => ({
      id: c.id,
      author: toPerson(c.author),
      body: c.body,
      isPublic: c.isPublic,
      createdAt: c.createdAt.toISOString(),
    })),
    history: t.statusEvents.map((e) => ({
      id: e.id,
      from: e.fromStatus,
      to: e.toStatus,
      actorName: e.actor?.user.name ?? "Sistema",
      occurredAt: e.occurredAt.toISOString(),
    })),
    engineers: await listTicketEngineers(areaIds),
  };
}

type PersonRecord = {
  userId: string;
  user: { name: string; image: string | null };
};

function toPerson(p: PersonRecord): Person {
  return { id: p.userId, name: p.user.name, image: p.user.image };
}
