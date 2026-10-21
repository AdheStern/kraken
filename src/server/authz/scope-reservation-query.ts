// src/server/authz/scope-reservation-query.ts
// Filtro de visibilidad de reservas de stock (AGENTS.md §2.8, §2.9): quienes operan ven todas; el gerente de
// área, las de líneas de su área; el comercial, las de sus CV (creador o vendedor).
// REGLA: todo listado de reservas pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { canOperateInventory } from "./inventory-permissions";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.ReservationWhereInput = { id: { in: [] } };

export function scopeReservationQuery(
  user: SessionUser,
): Prisma.ReservationWhereInput {
  if (canOperateInventory(user)) return {};
  const visible: Prisma.ReservationWhereInput[] = [];
  const managed = areaIdsWithRole(user, "GERENTE_AREA");
  if (managed.length > 0) visible.push({ cvLine: { areaId: { in: managed } } });
  if (hasRole(user, "COMERCIAL"))
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
  return visible.length > 0 ? { OR: visible } : NOTHING;
}
