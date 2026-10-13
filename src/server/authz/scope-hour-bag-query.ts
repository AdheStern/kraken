// src/server/authz/scope-hour-bag-query.ts
// Filtro de visibilidad de bolsas de horas según los roles (AGENTS.md §2.9, fila "Bolsas: ver saldo").
// REGLA: todo listado de bolsas pasa por aquí; prohibido escribir condiciones de visibilidad a mano (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.HourBagWhereInput = { id: { in: [] } };

export function scopeHourBagQuery(user: SessionUser): Prisma.HourBagWhereInput {
  if (hasRole(user, "GERENTE_GENERAL") || hasRole(user, "ADMINISTRACION"))
    return {};

  const visible: Prisma.HourBagWhereInput[] = [];
  const areaIds = bagAreaIds(user);
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
  // LIMITACIÓN: hasta F3 no hay tickets con bolsas; la condición ya queda escrita.
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

// [CONFIRMAR] §2.9 no tiene fila de bolsas para el coordinador de soporte; se asume que ve las de su área,
// porque define la jerarquía de bolsas de los tickets de su área (§2.6).
function bagAreaIds(user: SessionUser): string[] {
  return [
    ...areaIdsWithRole(user, "GERENTE_AREA"),
    ...areaIdsWithRole(user, "COORDINADOR_SOPORTE"),
  ];
}
