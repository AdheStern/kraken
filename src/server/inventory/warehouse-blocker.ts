// src/server/inventory/warehouse-blocker.ts
// Qué impide dar de baja un almacén (AGENTS.md §2.8, §4 borrado lógico): stock, reservas, traspasos o ajustes
// pendientes. TRANSITO no se da de baja nunca: por él pasan todos los traspasos.
import type { Tx } from "@/server/db";

export async function findWarehouseBlocker(
  tx: Tx,
  warehouseId: string,
): Promise<string | null> {
  const warehouse = await tx.warehouse.findUniqueOrThrow({
    where: { id: warehouseId },
    select: { kind: true },
  });
  if (warehouse.kind === "TRANSITO")
    return "El almacén de tránsito no se da de baja: por él pasan todos los traspasos.";
  if (await tx.stock.count({ where: { warehouseId, quantity: { gt: 0 } } }))
    return "Tiene stock: trasládalo a otro almacén o ajústalo antes de darlo de baja.";
  if (await tx.reservation.count({ where: { warehouseId, status: "ACTIVA" } }))
    return "Tiene reservas de CV activas: despáchalas o libéralas antes de darlo de baja.";
  const openTransfers = await tx.transfer.count({
    where: {
      status: { in: ["BORRADOR", "EN_TRANSITO", "RECIBIDO_CON_DIFERENCIAS"] },
      OR: [
        { originWarehouseId: warehouseId },
        { destinationWarehouseId: warehouseId },
      ],
    },
  });
  if (openTransfers)
    return "Tiene traspasos sin cerrar: recíbelos o cancélalos antes de darlo de baja.";
  const pending = await tx.adjustmentRequest.count({
    where: { warehouseId, status: "PENDIENTE" },
  });
  return pending
    ? "Tiene ajustes por decidir: resuélvelos antes de darlo de baja."
    : null;
}
