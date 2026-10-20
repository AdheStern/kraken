// src/server/authz/scope-hour-bag-query.ts
// Filtro de visibilidad de bolsas de horas según los roles (AGENTS.md §2.9, fila "Bolsas: ver saldo").
// REGLA: todo listado de bolsas pasa por aquí; prohibido escribir condiciones de visibilidad a mano (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { hasRole, memberAreaIds, type SessionUser } from "./roles";

const NOTHING: Prisma.HourBagWhereInput = { id: { in: [] } };

export function scopeHourBagQuery(user: SessionUser): Prisma.HourBagWhereInput {
  if (hasRole(user, "GERENTE_GENERAL") || hasRole(user, "ADMINISTRACION"))
    return {};

  const visible: Prisma.HourBagWhereInput[] = [];
  // REGLA: todo miembro de un área (cualquier rol con esa área) ve todas sus bolsas, con su historial (§2.9).
  const areaIds = memberAreaIds(user);
  if (areaIds.length > 0)
    visible.push({ areas: { some: { areaId: { in: areaIds } } } });
  if (hasRole(user, "COMERCIAL")) {
    visible.push({
      cvLine: {
        version: {
          cv: {
            OR: [
              { createdById: user.id },
              {
                versions: { some: { sellers: { some: { userId: user.id } } } },
              },
            ],
          },
        },
      },
    });
  }
  if (hasRole(user, "INGENIERO")) {
    visible.push({
      ticketBags: {
        some: {
          ticket: {
            OR: [
              { ownerId: user.id },
              { subtasks: { some: { assigneeId: user.id } } },
            ],
          },
        },
      },
    });
  }
  return visible.length > 0 ? { OR: visible } : NOTHING;
}
