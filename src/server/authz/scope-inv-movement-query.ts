// src/server/authz/scope-inv-movement-query.ts
// Filtro de visibilidad de los movimientos de inventario (kardex y comprobantes) (AGENTS.md §2.9).
// REGLA: el kardex lleva costos; solo quien los ve lo consulta. Todo listado de movimientos pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { canSeeInventoryCosts } from "./inventory-permissions";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.InvMovementWhereInput = { id: { in: [] } };

export function scopeInvMovementQuery(
  user: SessionUser,
): Prisma.InvMovementWhereInput {
  return canSeeInventoryCosts(user) ? {} : NOTHING;
}
