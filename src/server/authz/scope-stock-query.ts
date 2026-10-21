// src/server/authz/scope-stock-query.ts
// Filtro de visibilidad del stock (AGENTS.md §2.9, fila "Inventario"): quien consulta inventario ve el de todos
// los almacenes. Las columnas de valor las elige la query según canSeeInventoryCosts, nunca la interfaz.
// REGLA: todo listado de stock pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { canSeeInventory } from "./inventory-permissions";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.StockWhereInput = { id: { in: [] } };

export function scopeStockQuery(user: SessionUser): Prisma.StockWhereInput {
  return canSeeInventory(user) ? {} : NOTHING;
}
