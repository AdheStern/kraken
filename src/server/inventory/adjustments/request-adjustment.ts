// src/server/inventory/adjustments/request-adjustment.ts
// Pide un ajuste de inventario: el libro es inmutable, así que la diferencia espera aquí la aprobación del gerente
// del área o de Administración (AGENTS.md §2.8). Origen MANUAL, CONTEO o TRASPASO (baja de lo que no llegó).
import Decimal from "decimal.js";
import { pendingQuantity } from "@/domain/inventory/transfer-pending";
import type { AdjustmentOrigin } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { InventoryStateError } from "../inventory-errors";
import {
  findTransitWarehouse,
  loadTransferLines,
} from "../transfers/transfer-progress";
import { findAdjustmentDeciders } from "./adjustment-deciders";
import { type AdjustmentLine, adjustmentLinesSchema } from "./adjustment-lines";

export type AdjustmentRequestInput = {
  warehouseId: string;
  areaId: string | null;
  origin: AdjustmentOrigin;
  reason: string;
  lines: readonly AdjustmentLine[];
};

export async function requestAdjustment(
  tx: Tx,
  actorId: string,
  input: AdjustmentRequestInput,
): Promise<{ requestId: string }> {
  if (input.reason.trim().length < 5)
    throw new InventoryStateError(
      "Explica el motivo del ajuste (mínimo 5 caracteres).",
    );
  const parsed = adjustmentLinesSchema.safeParse(input.lines);
  if (!parsed.success)
    throw new InventoryStateError(parsed.error.issues[0].message);
  const lines = parsed.data;
  const warehouse = await tx.warehouse.findUniqueOrThrow({
    where: { id: input.warehouseId },
    select: { kind: true, isActive: true, name: true },
  });
  if (!warehouse.isActive)
    throw new InventoryStateError("El almacén está dado de baja.");
  // REGLA: en TRANSITO solo se da de baja lo que no llegó de un traspaso; el resto se ajusta en su almacén (§2.8).
  if ((warehouse.kind === "TRANSITO") !== (input.origin === "TRASPASO"))
    throw new InventoryStateError(
      "Las diferencias de un traspaso se ajustan en tránsito; las demás, en su almacén.",
    );
  if (input.origin === "TRASPASO") await assertTransferWriteOff(tx, lines);
  const request = await tx.adjustmentRequest.create({
    data: {
      warehouseId: input.warehouseId,
      areaId: input.areaId,
      origin: input.origin,
      reason: input.reason.trim(),
      lines,
      requestedById: actorId,
    },
    select: { id: true },
  });
  await notify(tx, {
    event: "AJUSTE_SOLICITADO",
    userIds: (await findAdjustmentDeciders(tx, input.areaId)).filter(
      (id) => id !== actorId,
    ),
    title: `Ajuste de inventario por decidir en ${warehouse.name}`,
    body: input.reason.trim(),
    link: "/inventario/ajustes",
  });
  return { requestId: request.id };
}

async function assertTransferWriteOff(
  tx: Tx,
  lines: readonly AdjustmentLine[],
): Promise<void> {
  const transitId = await findTransitWarehouse(tx);
  for (const line of lines) {
    if (!line.transferLineId || Number(line.delta) >= 0)
      throw new InventoryStateError(
        "La baja de un traspaso es negativa y nombra su línea.",
      );
    const transferLine = await tx.transferLine.findUniqueOrThrow({
      where: { id: line.transferLineId },
      select: { transferId: true },
    });
    const progress = await loadTransferLines(
      tx,
      transferLine.transferId,
      transitId,
    );
    const state = progress.find((p) => p.id === line.transferLineId);
    if (
      !state ||
      new Decimal(line.delta).abs().greaterThan(pendingQuantity(state))
    )
      throw new InventoryStateError(
        "No se da de baja más de lo que sigue en camino.",
      );
  }
}
