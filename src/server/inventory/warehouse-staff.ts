// src/server/inventory/warehouse-staff.ts
// Usuarios activos con el rol Almacén: reciben los avisos de inventario (opera todos los almacenes, decisión de
// 2026-10-21).
import type { Tx } from "@/server/db";

export async function findWarehouseStaff(tx: Tx): Promise<string[]> {
  const rows = await tx.userRole.findMany({
    where: { role: { code: "ALMACEN" }, user: { isActive: true } },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
