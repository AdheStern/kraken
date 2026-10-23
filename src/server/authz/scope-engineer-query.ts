// src/server/authz/scope-engineer-query.ts
// De qué ingenieros ve la utilización cada rol en el tablero operativo (AGENTS.md §2.9 "Tableros", §6).
// REGLA: todo listado de ingenieros de los tableros pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.UserProfileWhereInput = { userId: { in: [] } };

// REGLA: GG todos los ingenieros; gerente de área y coordinador los de sus áreas; el ingeniero solo a sí mismo.
export function scopeEngineerQuery(
  user: SessionUser,
): Prisma.UserProfileWhereInput {
  const isEngineer: Prisma.UserProfileWhereInput = {
    roles: { some: { role: { code: "INGENIERO" } } },
  };
  if (hasRole(user, "GERENTE_GENERAL")) return isEngineer;

  const areaIds = [
    ...new Set([
      ...areaIdsWithRole(user, "GERENTE_AREA"),
      ...areaIdsWithRole(user, "COORDINADOR_SOPORTE"),
    ]),
  ];
  const visible: Prisma.UserProfileWhereInput[] = [];
  if (areaIds.length > 0) {
    visible.push({
      roles: {
        some: { role: { code: "INGENIERO" }, areaId: { in: areaIds } },
      },
    });
  }
  if (hasRole(user, "INGENIERO")) visible.push({ userId: user.id });
  return visible.length > 0 ? { OR: visible } : NOTHING;
}
