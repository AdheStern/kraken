// src/server/authz/scope-cv-hours-query.ts
// Filtro de los CV que un ingeniero ve en su vista de horas: los de las bolsas de sus tickets (AGENTS.md §2.9,
// fila "CV: ver", columna Ingeniero: solo cabecera y líneas de horas).
// REGLA: separado de scopeCvQuery para que el ingeniero nunca abra el editor ni el listado con montos (regla 12).
import type { Prisma } from "@/generated/prisma/client";
import { hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.CvWhereInput = { id: { in: [] } };

export function scopeCvHoursQuery(user: SessionUser): Prisma.CvWhereInput {
  if (!hasRole(user, "INGENIERO")) return NOTHING;
  const myTicket: Prisma.TicketWhereInput = {
    OR: [{ ownerId: user.id }, { subtasks: { some: { assigneeId: user.id } } }],
  };
  return {
    versions: {
      some: {
        lines: {
          some: { hourBag: { ticketBags: { some: { ticket: myTicket } } } },
        },
      },
    },
  };
}
