// src/server/inventory/adjustments/decide-adjustment.ts
// Aprueba o rechaza una solicitud de ajuste (AGENTS.md §2.8): al aprobarse inserta el AJUSTE en el libro, revalidado
// contra el stock de ese momento; la baja de un traspaso se valoriza contra lo que envió su línea.
import Decimal from "decimal.js";
import {
  proportionalValue,
  valueAtAverage,
} from "@/domain/inventory/stock-valuation";
import { settledTransferStatus } from "@/domain/inventory/transfer-pending";
import { roundHalfUp2 } from "@/domain/pricing/money";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { InventoryStateError } from "../inventory-errors";
import { type LockedStocks, lockedStock, lockStocks } from "../lock-stocks";
import { type InvLineInput, postInvMovement } from "../post-inv-movement";
import { resolveOutboundSerials } from "../serial-lookup";
import { resolveInboundSerials } from "../serial-units";
import {
  findTransitWarehouse,
  loadTransferLines,
  type TransferLineState,
} from "../transfers/transfer-progress";
import { type AdjustmentLine, adjustmentLinesSchema } from "./adjustment-lines";

export type AdjustmentDecision = {
  requestId: string;
  approve: boolean;
  comment: string;
};

type Request = {
  id: string;
  warehouseId: string;
  requestedById: string;
  lines: AdjustmentLine[];
};

// REGLA: el permiso (canDecideAdjustment) lo valida la action; aquí, que siga PENDIENTE (dos decisiones a la vez).
export async function decideAdjustment(
  tx: Tx,
  actorId: string,
  decision: AdjustmentDecision,
): Promise<void> {
  if (!decision.approve && decision.comment.trim().length < 5)
    throw new InventoryStateError(
      "Explica por qué se rechaza (mínimo 5 caracteres).",
    );
  const { count } = await tx.adjustmentRequest.updateMany({
    where: { id: decision.requestId, status: "PENDIENTE" },
    data: {
      status: decision.approve ? "APROBADO" : "RECHAZADO",
      decidedById: actorId,
      decidedAt: new Date(),
      decisionComment: decision.comment.trim() || null,
    },
  });
  if (count === 0)
    throw new InventoryStateError("Esta solicitud ya fue decidida.");
  const row = await tx.adjustmentRequest.findUniqueOrThrow({
    where: { id: decision.requestId },
    select: { id: true, warehouseId: true, requestedById: true, lines: true },
  });
  const request: Request = {
    ...row,
    lines: adjustmentLinesSchema.parse(row.lines),
  };
  if (decision.approve) await postAdjustment(tx, actorId, request);
  await notify(tx, {
    event: "AJUSTE_DECIDIDO",
    userIds: [request.requestedById],
    title: decision.approve
      ? "Tu ajuste de inventario fue aprobado"
      : "Tu ajuste de inventario fue rechazado",
    body: decision.comment.trim() || "Sin comentario.",
    link: "/inventario/ajustes",
  });
}

async function postAdjustment(
  tx: Tx,
  actorId: string,
  request: Request,
): Promise<void> {
  const locked = await lockStocks(
    tx,
    request.lines.map((l) => ({
      warehouseId: request.warehouseId,
      productId: l.productId,
    })),
  );
  const transfers = await transferStates(tx, request.lines);
  const lines: InvLineInput[] = [];
  for (const line of request.lines)
    lines.push(
      ...(await toInvLines(tx, locked, request.warehouseId, line, transfers)),
    );
  await postInvMovement(tx, locked, {
    kind: "AJUSTE",
    warehouseId: request.warehouseId,
    actorId,
    adjustmentRequestId: request.id,
    lines,
  });
  for (const transferId of new Set(
    [...transfers.values()].map((t) => t.transferId),
  ))
    await settleTransfer(tx, transferId);
}

async function toInvLines(
  tx: Tx,
  locked: LockedStocks,
  warehouseId: string,
  line: AdjustmentLine,
  transfers: Map<string, TransferLineState & { transferId: string }>,
): Promise<InvLineInput[]> {
  const delta = new Decimal(line.delta);
  if (!delta.isNegative()) return inboundLines(tx, locked, warehouseId, line);
  const transfer = line.transferLineId
    ? transfers.get(line.transferLineId)
    : undefined;
  return outboundLines(tx, warehouseId, line, transfer);
}

async function outboundLines(
  tx: Tx,
  warehouseId: string,
  line: AdjustmentLine,
  transfer?: TransferLineState,
): Promise<InvLineInput[]> {
  const quantity = new Decimal(line.delta).abs();
  if (transfer?.sentValueUsd)
    return [
      {
        productId: line.productId,
        direction: "OUT",
        quantity,
        valueUsd: proportionalValue(
          transfer.sentValueUsd,
          transfer.quantitySent,
          quantity,
          transfer.receivedQuantity.plus(transfer.writtenOffQuantity),
        ),
        serialUnitId: transfer.serialUnitId ?? undefined,
        transferLineId: transfer.id,
      },
    ];
  if (line.serials.length === 0)
    return [{ productId: line.productId, direction: "OUT", quantity }];
  const ids = await resolveOutboundSerials(
    tx,
    line.productId,
    warehouseId,
    line.serials,
  );
  return ids.map((serialUnitId) => ({
    productId: line.productId,
    direction: "OUT" as const,
    quantity: new Decimal(1),
    serialUnitId,
  }));
}

// REGLA: lo que entra por ajuste vale al promedio vigente; sin stock, al costo indicado (§2.8).
async function inboundLines(
  tx: Tx,
  locked: LockedStocks,
  warehouseId: string,
  line: AdjustmentLine,
): Promise<InvLineInput[]> {
  const quantity = new Decimal(line.delta);
  const stock = lockedStock(locked, { warehouseId, productId: line.productId });
  const unitValue = stock.quantity.isZero()
    ? line.unitCostUsd !== null
      ? new Decimal(line.unitCostUsd)
      : null
    : valueAtAverage(stock, new Decimal(1));
  if (unitValue === null)
    throw new InventoryStateError(
      "Sin stock no hay promedio: indica el costo de lo que entra.",
    );
  if (line.serials.length === 0)
    return [
      {
        productId: line.productId,
        direction: "IN",
        quantity,
        valueUsd: stock.quantity.isZero()
          ? roundHalfUp2(unitValue.mul(quantity))
          : valueAtAverage(stock, quantity),
      },
    ];
  const ids = await resolveInboundSerials(tx, line.productId, line.serials);
  return line.serials.map((serial) => ({
    productId: line.productId,
    direction: "IN" as const,
    quantity: new Decimal(1),
    valueUsd: unitValue,
    serialUnitId: ids.get(serial.trim()),
  }));
}

async function transferStates(tx: Tx, lines: readonly AdjustmentLine[]) {
  const states = new Map<string, TransferLineState & { transferId: string }>();
  const ids = lines.flatMap((l) =>
    l.transferLineId ? [l.transferLineId] : [],
  );
  if (ids.length === 0) return states;
  const transitId = await findTransitWarehouse(tx);
  const rows = await tx.transferLine.findMany({
    where: { id: { in: ids } },
    select: { transferId: true },
  });
  for (const transferId of new Set(rows.map((r) => r.transferId)))
    for (const state of await loadTransferLines(tx, transferId, transitId))
      if (ids.includes(state.id))
        states.set(state.id, { ...state, transferId });
  return states;
}

// POR QUÉ: dar de baja lo que no llegó también cierra el traspaso si ya no queda nada en camino (§8).
async function settleTransfer(tx: Tx, transferId: string): Promise<void> {
  const lines = await loadTransferLines(
    tx,
    transferId,
    await findTransitWarehouse(tx),
  );
  await tx.transfer.update({
    where: { id: transferId },
    data: { status: settledTransferStatus(lines) },
  });
}
