// src/features/inventory/queries/list-warehouse-tabs.ts
// Almacenes activos para las pestañas del inventario: primero los físicos, luego los lógicos (AGENTS.md §2.8).
// POR QUÉ: los almacenes son un catálogo sin datos de terceros; la página exige canSeeInventory antes.
import { prisma } from "@/server/db";
import type { WarehouseTab } from "../types";

const KIND_ORDER = { FISICO: 0, DEMOSTRACION: 1, REPUESTOS: 2, TRANSITO: 3 };

export async function listWarehouseTabs(): Promise<WarehouseTab[]> {
  const rows = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, kind: true },
  });
  return rows.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}
