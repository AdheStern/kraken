// src/server/authz/scope-project-query.ts
// Filtro de visibilidad de proyectos, el contenedor de tickets (AGENTS.md §2.6; misma lógica que "Tickets: ver" §2.9).
// REGLA: todo listado de proyectos pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.ProjectWhereInput = { id: { in: [] } };

export function scopeProjectQuery(user: SessionUser): Prisma.ProjectWhereInput {
  if (hasRole(user, "GERENTE_GENERAL")) return {};
  const visible: Prisma.ProjectWhereInput[] = [];
  const areaIds = [
    ...new Set([
      ...areaIdsWithRole(user, "GERENTE_AREA"),
      ...areaIdsWithRole(user, "COORDINADOR_SOPORTE"),
    ]),
  ];
  if (areaIds.length > 0)
    visible.push({ areas: { some: { areaId: { in: areaIds } } } });
  if (hasRole(user, "COMERCIAL"))
    visible.push({
      customer: {
        cvs: {
          some: {
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
  if (hasRole(user, "INGENIERO"))
    visible.push({
      tickets: {
        some: {
          OR: [
            { ownerId: user.id },
            { subtasks: { some: { assigneeId: user.id } } },
          ],
        },
      },
    });
  return visible.length > 0 ? { OR: visible } : NOTHING;
}
