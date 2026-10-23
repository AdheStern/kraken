// src/server/authz/scope-goal-query.ts
// Filtro de visibilidad de las metas (KGI) (AGENTS.md §2.9 "Tableros", §6).
// REGLA: todo listado de metas pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.GoalWhereInput = { id: { in: [] } };

// REGLA: GG y Administración ven todas, también la de la empresa; el gerente de área, las de sus áreas.
export function scopeGoalQuery(user: SessionUser): Prisma.GoalWhereInput {
  if (hasRole(user, "GERENTE_GENERAL") || hasRole(user, "ADMINISTRACION"))
    return {};
  const managedAreaIds = areaIdsWithRole(user, "GERENTE_AREA");
  return managedAreaIds.length > 0
    ? { areaId: { in: managedAreaIds } }
    : NOTHING;
}
