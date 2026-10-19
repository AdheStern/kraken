// src/server/tickets/load-ticket-access.ts
// Lee lo que deciden los permisos de un ticket: sus áreas, su encargado y los asignados de sus subtareas
// (AGENTS.md §2.9).
import type { TicketAccess } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";

export async function loadTicketAccess(
  tx: Tx,
  ticketId: string,
): Promise<TicketAccess | null> {
  const ticket = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: {
      ownerId: true,
      areas: { select: { areaId: true } },
      subtasks: {
        where: { assigneeId: { not: null } },
        select: { assigneeId: true },
      },
    },
  });
  if (!ticket) return null;
  return {
    areaIds: ticket.areas.map((a) => a.areaId),
    ownerId: ticket.ownerId,
    subtaskAssigneeIds: ticket.subtasks.flatMap((s) =>
      s.assigneeId ? [s.assigneeId] : [],
    ),
  };
}

// REGLA: el encargado o el asignado de una subtarea es un ingeniero activo de un área del ticket (o sin área).
export async function isTicketEngineer(
  tx: Tx,
  userId: string,
  areaIds: readonly string[],
): Promise<boolean> {
  const role = await tx.userRole.findFirst({
    where: {
      userId,
      role: { code: "INGENIERO" },
      user: { isActive: true },
      OR: [{ areaId: null }, { areaId: { in: [...areaIds] } }],
    },
    select: { userId: true },
  });
  return role !== null;
}
