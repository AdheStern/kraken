// src/server/inventory/transfers/send-transfer.ts
// Envía un traspaso (AGENTS.md §2.8): sale del origen al promedio y entra a TRANSITO con ese mismo valor, que queda
// guardado en cada línea para valorizar después su recepción o su baja.
import Decimal from "decimal.js";
import { canTransitionTransfer } from "@/domain/inventory/transfer-state-machine";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import {
  InsufficientStockError,
  InventoryStateError,
} from "../inventory-errors";
import { type LockedStocks, lockStocks, stockKey } from "../lock-stocks";
import { postInvMovement } from "../post-inv-movement";
import { findWarehouseStaff } from "../warehouse-staff";
import {
  findTransitWarehouse,
  type LockedTransfer,
  lockTransfer,
} from "./transfer-progress";

type Line = {
  id: string;
  productId: string;
  quantitySent: { toString(): string };
  serialUnitId: string | null;
};

export async function sendTransfer(
  tx: Tx,
  actorId: string,
  transferId: string,
): Promise<void> {
  const transfer = await lockTransfer(tx, transferId);
  if (!canTransitionTransfer(transfer.status, "EN_TRANSITO"))
    throw new InventoryStateError("Este traspaso ya se envió o se canceló.");
  const transitId = await findTransitWarehouse(tx);
  const lines: Line[] = await tx.transferLine.findMany({
    where: { transferId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      productId: true,
      quantitySent: true,
      serialUnitId: true,
    },
  });
  const products = [...new Set(lines.map((l) => l.productId))];
  const locked = await lockStocks(tx, [
    ...products.map((productId) => ({
      warehouseId: transfer.originWarehouseId,
      productId,
    })),
    ...products.map((productId) => ({ warehouseId: transitId, productId })),
  ]);
  await assertAvailable(tx, locked, transfer.originWarehouseId, lines);
  const sent = await moveToTransit(tx, locked, {
    transfer,
    transitId,
    actorId,
    lines,
  });
  await markSent(tx, transferId, actorId, lines, sent);
  await notify(tx, {
    event: "TRASPASO_ENVIADO",
    userIds: (await findWarehouseStaff(tx)).filter((id) => id !== actorId),
    title: `Traspaso N.º ${transfer.number} en camino`,
    body: "Recíbelo en el almacén de destino y confirma cantidades y seriales.",
    link: `/inventario/traspasos/${transferId}`,
  });
}

async function moveToTransit(
  tx: Tx,
  locked: LockedStocks,
  ctx: {
    transfer: LockedTransfer;
    transitId: string;
    actorId: string;
    lines: readonly Line[];
  },
): Promise<{ valueUsd: Decimal }[]> {
  const { transfer, lines } = ctx;
  const base = {
    kind: "TRASPASO" as const,
    actorId: ctx.actorId,
    transferId: transfer.id,
    documentRef: `Traspaso N.º ${transfer.number}`,
  };
  const out = await postInvMovement(tx, locked, {
    ...base,
    warehouseId: transfer.originWarehouseId,
    lines: lines.map((l) => ({
      productId: l.productId,
      direction: "OUT" as const,
      quantity: new Decimal(l.quantitySent.toString()),
      serialUnitId: l.serialUnitId ?? undefined,
      transferLineId: l.id,
    })),
  });
  await postInvMovement(tx, locked, {
    ...base,
    warehouseId: ctx.transitId,
    lines: out.lines.map((posted, i) => ({
      productId: posted.productId,
      direction: "IN" as const,
      quantity: posted.quantity.abs(),
      valueUsd: posted.valueUsd.abs(),
      serialUnitId: lines[i].serialUnitId ?? undefined,
      transferLineId: lines[i].id,
    })),
  });
  return out.lines;
}

async function markSent(
  tx: Tx,
  transferId: string,
  actorId: string,
  lines: readonly Line[],
  posted: readonly { valueUsd: Decimal }[],
): Promise<void> {
  for (const [i, line] of lines.entries())
    await tx.transferLine.update({
      where: { id: line.id },
      data: { sentValueUsd: posted[i].valueUsd.abs().toFixed(2) },
    });
  await tx.transfer.update({
    where: { id: transferId },
    data: { status: "EN_TRANSITO", sentById: actorId, sentAt: new Date() },
  });
}

// REGLA: lo reservado es de su CV; un traspaso solo lleva lo disponible del origen (§2.8).
async function assertAvailable(
  tx: Tx,
  locked: LockedStocks,
  warehouseId: string,
  lines: readonly Line[],
): Promise<void> {
  const totals = new Map<string, Decimal>();
  for (const l of lines)
    totals.set(
      l.productId,
      (totals.get(l.productId) ?? new Decimal(0)).plus(
        l.quantitySent.toString(),
      ),
    );
  for (const [productId, quantity] of totals) {
    const stock = locked.get(stockKey({ warehouseId, productId }));
    const available = stock
      ? stock.quantity.minus(stock.reservedQuantity)
      : new Decimal(0);
    if (quantity.greaterThan(available)) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { code: true },
      });
      throw new InsufficientStockError(
        product?.code ?? "el producto",
        Decimal.max(available, 0).toString(),
      );
    }
  }
}
