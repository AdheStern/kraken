// src/server/authz/scope-adjustment-request-query.ts
// Filtro de visibilidad de solicitudes de ajuste de inventario (AGENTS.md §2.9): quienes operan y Administración
// ven todas; el gerente de área, las de sus áreas. REGLA: todo listado pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { canOperateInventory } from "./inventory-permissions";
import { areaIdsWithRole, type SessionUser } from "./roles";

const NOTHING: Prisma.AdjustmentRequestWhereInput = { id: { in: [] } };

export function scopeAdjustmentRequestQuery(
  user: SessionUser,
): Prisma.AdjustmentRequestWhereInput {
  if (canOperateInventory(user)) return {};
  const managed = areaIdsWithRole(user, "GERENTE_AREA");
  return managed.length > 0 ? { areaId: { in: managed } } : NOTHING;
}
