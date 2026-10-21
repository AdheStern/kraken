// src/server/authz/scope-transfer-query.ts
// Filtro de visibilidad de traspasos (AGENTS.md §2.8, §2.9): los ven quienes operan inventario, en todos los
// almacenes. REGLA: todo listado de traspasos pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { canOperateInventory } from "./inventory-permissions";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.TransferWhereInput = { id: { in: [] } };

export function scopeTransferQuery(
  user: SessionUser,
): Prisma.TransferWhereInput {
  return canOperateInventory(user) ? {} : NOTHING;
}
