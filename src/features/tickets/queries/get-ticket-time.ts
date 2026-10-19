// src/features/tickets/queries/get-ticket-time.ts
// Tiempo de un ticket: sus registros (de todos los participantes), los contadores abiertos del usuario y dónde
// puede registrar; null si el ticket no es visible (AGENTS.md §2.6 registro de tiempo, §2.9).
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { canLogTimeOn } from "@/server/authz/ticket-permissions";
import { prisma } from "@/server/db";
import type { TicketTime } from "../types";
import { listOpenTimers } from "./list-open-timers";

const MINUTE_MS = 60_000;

export async function getTicketTime(
  user: SessionUser,
  ticketId: string,
): Promise<TicketTime | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, scopeTicketQuery(user)] },
    select: {
      ownerId: true,
      status: true,
      areas: { select: { areaId: true } },
      subtasks: { select: { id: true, title: true, assigneeId: true } },
      timeEntries: {
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          source: true,
          isLate: true,
          subtask: { select: { title: true } },
          user: {
            select: {
              userId: true,
              user: { select: { name: true, image: true } },
            },
          },
        },
      },
    },
  });
  if (!ticket) return null;
  const access = {
    areaIds: ticket.areas.map((a) => a.areaId),
    ownerId: ticket.ownerId,
    subtaskAssigneeIds: ticket.subtasks.flatMap((s) =>
      s.assigneeId ? [s.assigneeId] : [],
    ),
  };
  const isOpen = ticket.status !== "CERRADO" && ticket.status !== "CANCELADO";
  return {
    entries: ticket.timeEntries.map((e) => ({
      id: e.id,
      person: {
        id: e.user.userId,
        name: e.user.user.name,
        image: e.user.user.image,
      },
      subtaskTitle: e.subtask?.title ?? null,
      startedAt: e.startedAt.toISOString(),
      endedAt: e.endedAt?.toISOString() ?? null,
      minutes: e.endedAt
        ? Math.ceil((e.endedAt.getTime() - e.startedAt.getTime()) / MINUTE_MS)
        : null,
      source: e.source,
      isLate: e.isLate,
      canDelete: isOpen && e.source === "MANUAL" && e.user.userId === user.id,
    })),
    timers: await listOpenTimers(user.id, ticketId),
    // POR QUÉ: «null» es el ticket mismo; las subtareas son solo aquellas en las que el usuario puede registrar.
    targets: [
      ...(canLogTimeOn(user, access, undefined)
        ? [{ id: null, label: "El ticket" }]
        : []),
      ...ticket.subtasks
        .filter((s) => canLogTimeOn(user, access, s.assigneeId))
        .map((s) => ({ id: s.id, label: `Subtarea: ${s.title}` })),
    ],
  };
}
