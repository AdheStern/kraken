// src/server/inventory/transfers/receive-transfer.ts
// Recibe en el destino lo que llegó de un traspaso (AGENTS.md §2.8): sale de TRANSITO al valor que envió esa línea
// y entra al destino con el mismo valor. Lo que no llegó queda en TRANSITO como diferencia (decisión de 2026-10-21).
import type Decimal from "decimal.js";
import { proportionalValue } from "@/domain/inventory/stock-valuation";
import {
  settledTransferStatus,
  validateReceipt,
} from "@/domain/inventory/transfer-pending";
import { acceptsSettlement } from "@/domain/inventory/transfer-state-machine";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { InventoryStateError } from "../inventory-errors";
import { lockStocks } from "../lock-stocks";
import { type InvLineInput, postInvMovement } from "../post-inv-movement";
import { findWarehouseStaff } from "../warehouse-staff";
import {
  findTransitWarehouse,
  type LockedTransfer,
  loadTransferLines,
  lockTransfer,
  type TransferLineState,
} from "./transfer-progress";

export type TransferReceipt = { transferLineId: string; quantity: Decimal };

type Settled = "RECIBIDO" | "RECIBIDO_CON_DIFERENCIAS";

export async function receiveTransfer(
  tx: Tx,
  actorId: string,
  transferId: string,
  receipts: readonly TransferReceipt[],
): Promise<{ status: Settled }> {
  const transfer = await lockTransfer(tx, transferId);
  if (!acceptsSettlement(transfer.status))
    throw new InventoryStateError("Este traspaso no tiene nada en camino.");
  if (receipts.length === 0) throw new InventoryStateError("Indica qué llegó.");
  const transitId = await findTransitWarehouse(tx);
  const lines = await loadTransferLines(tx, transferId, transitId);
  const products = [...new Set(lines.map((l) => l.productId))];
  const locked = await lockStocks(tx, [
    ...products.map((productId) => ({ warehouseId: transitId, productId })),
    ...products.map((productId) => ({
      warehouseId: transfer.destinationWarehouseId,
      productId,
    })),
  ]);
  const valued = receipts.map((r) => valueReceipt(lines, r));
  const base = {
    kind: "TRASPASO" as const,
    actorId,
    transferId,
    documentRef: `Traspaso N.º ${transfer.number}`,
  };
  await postInvMovement(tx, locked, {
    ...base,
    warehouseId: transitId,
    lines: valued.map((v) => ({ ...v, direction: "OUT" as const })),
  });
  await postInvMovement(tx, locked, {
    ...base,
    warehouseId: transfer.destinationWarehouseId,
    lines: valued.map((v) => ({ ...v, direction: "IN" as const })),
  });
  const status = settledTransferStatus(lines);
  await tx.transfer.update({
    where: { id: transferId },
    data: { status, receivedById: actorId, receivedAt: new Date() },
  });
  if (status === "RECIBIDO_CON_DIFERENCIAS")
    await notifyDifferences(tx, transfer, actorId);
  return { status };
}

// POR QUÉ: actualiza lo ya recibido de la línea en memoria, así dos recepciones de la misma línea en un pedido
// respetan el pendiente y suman exacto el valor enviado.
function valueReceipt(
  lines: TransferLineState[],
  receipt: TransferReceipt,
): Omit<InvLineInput, "direction"> {
  const line = lines.find((l) => l.id === receipt.transferLineId);
  if (!line?.sentValueUsd)
    throw new InventoryStateError("Una línea no es de este traspaso.");
  const issue = validateReceipt(
    { ...line, isSerial: line.serialUnitId !== null },
    receipt.quantity,
  );
  if (issue) throw new InventoryStateError(issue);
  const taken = line.receivedQuantity.plus(line.writtenOffQuantity);
  const valueUsd = proportionalValue(
    line.sentValueUsd,
    line.quantitySent,
    receipt.quantity,
    taken,
  );
  line.receivedQuantity = line.receivedQuantity.plus(receipt.quantity);
  return {
    productId: line.productId,
    quantity: receipt.quantity,
    valueUsd,
    serialUnitId: line.serialUnitId ?? undefined,
    transferLineId: line.id,
  };
}

async function notifyDifferences(
  tx: Tx,
  transfer: LockedTransfer,
  actorId: string,
): Promise<void> {
  const staff = await findWarehouseStaff(tx);
  await notify(tx, {
    event: "TRASPASO_CON_DIFERENCIAS",
    userIds: [...staff, transfer.createdById].filter((id) => id !== actorId),
    title: `Traspaso N.º ${transfer.number} con diferencias`,
    body: "Parte de lo enviado sigue en tránsito: recíbelo cuando llegue o pide un ajuste para darlo de baja.",
    link: `/inventario/traspasos/${transfer.id}`,
  });
}
