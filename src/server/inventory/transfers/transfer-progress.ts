// src/server/inventory/transfers/transfer-progress.ts
// Bloquea un traspaso (SELECT … FOR UPDATE) y calcula, por línea, cuánto salió ya de TRANSITO: lo recibido y lo
// dado de baja son salidas de TRANSITO enlazadas a la línea (AGENTS.md §2.8, ADR-03).
import Decimal from "decimal.js";
import type { TransferLineProgress } from "@/domain/inventory/transfer-pending";
import type { TransferStatus } from "@/domain/inventory/transfer-state-machine";
import type { Tx } from "@/server/db";
import { InventoryStateError } from "../inventory-errors";

export type LockedTransfer = {
  id: string;
  number: number;
  status: TransferStatus;
  originWarehouseId: string;
  destinationWarehouseId: string;
  createdById: string;
};

export type TransferLineState = TransferLineProgress & {
  id: string;
  productId: string;
  serialUnitId: string | null;
  sentValueUsd: Decimal | null;
};

// TRAMPA: primero el traspaso y después el stock, siempre en ese orden; dos recepciones simultáneas se serializan.
export async function lockTransfer(
  tx: Tx,
  transferId: string,
): Promise<LockedTransfer> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM inv.traspaso WHERE id = ${transferId}::uuid FOR UPDATE`;
  if (rows.length === 0)
    throw new InventoryStateError("El traspaso ya no existe.");
  return tx.transfer.findUniqueOrThrow({
    where: { id: transferId },
    select: {
      id: true,
      number: true,
      status: true,
      originWarehouseId: true,
      destinationWarehouseId: true,
      createdById: true,
    },
  });
}

export async function loadTransferLines(
  tx: Tx,
  transferId: string,
  transitWarehouseId: string,
): Promise<TransferLineState[]> {
  const lines = await tx.transferLine.findMany({
    where: { transferId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      productId: true,
      quantitySent: true,
      sentValueUsd: true,
      serialUnitId: true,
      movementLines: {
        where: {
          quantity: { lt: 0 },
          movement: { warehouseId: transitWarehouseId },
        },
        select: { quantity: true, movement: { select: { kind: true } } },
      },
    },
  });
  return lines.map((line) => {
    const out = (kind: string) =>
      line.movementLines
        .filter((m) => (kind === "AJUSTE") === (m.movement.kind === "AJUSTE"))
        .reduce(
          (sum, m) => sum.plus(new Decimal(m.quantity.toString()).abs()),
          new Decimal(0),
        );
    return {
      id: line.id,
      productId: line.productId,
      serialUnitId: line.serialUnitId,
      quantitySent: new Decimal(line.quantitySent.toString()),
      sentValueUsd: line.sentValueUsd
        ? new Decimal(line.sentValueUsd.toString())
        : null,
      receivedQuantity: out("TRASPASO"),
      writtenOffQuantity: out("AJUSTE"),
    };
  });
}

export async function findTransitWarehouse(tx: Tx): Promise<string> {
  const transit = await tx.warehouse.findFirst({
    where: { kind: "TRANSITO" },
    select: { id: true },
  });
  if (!transit)
    throw new InventoryStateError(
      "No existe el almacén de tránsito; corre db:seed:base o pide que lo creen.",
    );
  return transit.id;
}
