// src/server/inventory/stock-watchers.ts
// A quién avisar de una reserva de stock (AGENTS.md §2.8): todo el rol Almacén (opera todos los almacenes,
// decisión de 2026-10-21) y los vendedores y el creador del CV.
import type { Tx } from "@/server/db";
import { findWarehouseStaff } from "./warehouse-staff";

// TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión.
export async function findStockWatchers(
  tx: Tx,
  versionId: string,
): Promise<string[]> {
  const warehouseStaff = await findWarehouseStaff(tx);
  const version = await tx.cvVersion.findUniqueOrThrow({
    where: { id: versionId },
    select: {
      sellers: { select: { userId: true } },
      cv: { select: { createdById: true } },
    },
  });
  return [
    ...warehouseStaff,
    ...version.sellers.map((s) => s.userId),
    version.cv.createdById,
  ];
}
