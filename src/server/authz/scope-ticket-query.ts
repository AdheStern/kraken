// src/server/authz/scope-ticket-query.ts
// Filtro de visibilidad de tickets según los roles (AGENTS.md §2.9, fila "Tickets: ver").
// REGLA: todo listado de tickets pasa por aquí; prohibido escribir condiciones de visibilidad a mano (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.TicketWhereInput = { id: { in: [] } };

// REGLA: GG todos; gerente de área y coordinador los de su área; comercial los de los clientes de sus CV;
// ingeniero los que tiene a cargo o con una subtarea suya; Administración ninguno (§2.9).
export function scopeTicketQuery(user: SessionUser): Prisma.TicketWhereInput {
  if (hasRole(user, "GERENTE_GENERAL")) return {};

  const visible: Prisma.TicketWhereInput[] = [];
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
      OR: [
        { ownerId: user.id },
        { subtasks: { some: { assigneeId: user.id } } },
      ],
    });
  return visible.length > 0 ? { OR: visible } : NOTHING;
}
