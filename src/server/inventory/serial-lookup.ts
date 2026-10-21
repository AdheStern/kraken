// src/server/inventory/serial-lookup.ts
// Seriales que salen de un almacén: deben existir y estar en ese almacén (AGENTS.md §2.8). El estado final se
// valida de nuevo con el stock bloqueado, en postInvMovement.
import type { Tx } from "@/server/db";
import { InventoryStateError } from "./inventory-errors";

export async function resolveOutboundSerials(
  tx: Tx,
  productId: string,
  warehouseId: string,
  serials: readonly string[],
): Promise<string[]> {
  const wanted = [...new Set(serials.map((s) => s.trim()).filter(Boolean))];
  if (wanted.length !== serials.length)
    throw new InventoryStateError(
      "Hay seriales repetidos o vacíos en la salida.",
    );
  const units = await tx.serialUnit.findMany({
    where: { productId, serial: { in: wanted } },
    select: { id: true, serial: true, warehouseId: true },
  });
  const missing = wanted.filter(
    (serial) =>
      !units.some((u) => u.serial === serial && u.warehouseId === warehouseId),
  );
  if (missing.length > 0)
    throw new InventoryStateError(
      `Estos seriales no están en el almacén: ${missing.join(", ")}.`,
    );
  return wanted.map(
    (serial) => units.find((u) => u.serial === serial)?.id as string,
  );
}
