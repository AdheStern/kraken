// src/server/inventory/transfers/create-transfer.ts
// Arma un traspaso en BORRADOR entre dos almacenes (AGENTS.md §2.8): aún no mueve stock; un serial por línea.
import Decimal from "decimal.js";
import type { Tx } from "@/server/db";
import { InventoryStateError } from "../inventory-errors";
import { resolveOutboundSerials } from "../serial-lookup";

export type TransferDraftInput = {
  originWarehouseId: string;
  destinationWarehouseId: string;
  notes: string | null;
  lines: readonly { productId: string; quantity: Decimal; serials: string[] }[];
};

export async function createTransfer(
  tx: Tx,
  actorId: string,
  input: TransferDraftInput,
): Promise<{ transferId: string; number: number }> {
  if (input.originWarehouseId === input.destinationWarehouseId)
    throw new InventoryStateError(
      "El origen y el destino son el mismo almacén.",
    );
  const warehouses = await tx.warehouse.findMany({
    where: {
      id: { in: [input.originWarehouseId, input.destinationWarehouseId] },
      isActive: true,
    },
    select: { kind: true },
  });
  if (warehouses.length !== 2 || warehouses.some((w) => w.kind === "TRANSITO"))
    throw new InventoryStateError(
      "Elige dos almacenes activos; el de tránsito se usa solo por dentro.",
    );
  const lines = await toDraftLines(tx, input);
  if (lines.length === 0)
    throw new InventoryStateError("Agrega al menos un producto al traspaso.");
  const transfer = await tx.transfer.create({
    data: {
      originWarehouseId: input.originWarehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      notes: input.notes,
      createdById: actorId,
      lines: { create: lines },
    },
    select: { id: true, number: true },
  });
  return { transferId: transfer.id, number: transfer.number };
}

// REGLA: un serializado viaja con una línea por serial, que debe estar hoy en el origen (§2.8).
async function toDraftLines(tx: Tx, input: TransferDraftInput) {
  const lines: {
    productId: string;
    quantitySent: string;
    serialUnitId?: string;
  }[] = [];
  for (const line of input.lines) {
    if (line.serials.length === 0) {
      lines.push({
        productId: line.productId,
        quantitySent: line.quantity.toFixed(2),
      });
      continue;
    }
    if (!line.quantity.equals(line.serials.length))
      throw new InventoryStateError(
        "Indica un serial por cada unidad que viaja.",
      );
    const ids = await resolveOutboundSerials(
      tx,
      line.productId,
      input.originWarehouseId,
      line.serials,
    );
    for (const serialUnitId of ids)
      lines.push({
        productId: line.productId,
        quantitySent: new Decimal(1).toFixed(2),
        serialUnitId,
      });
  }
  return lines;
}
