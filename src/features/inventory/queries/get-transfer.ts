// src/features/inventory/queries/get-transfer.ts
// Detalle de un traspaso visible (scopeTransferQuery): por línea, lo enviado, lo recibido, lo dado de baja y lo que
// sigue en TRANSITO, con la misma cuenta que usa la recepción (AGENTS.md §2.8).
import { pendingQuantity } from "@/domain/inventory/transfer-pending";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTransferQuery } from "@/server/authz/scope-transfer-query";
import { prisma } from "@/server/db";
import {
  findTransitWarehouse,
  loadTransferLines,
} from "@/server/inventory/transfers/transfer-progress";
import type { TransferDetail } from "../types";

export async function getTransfer(
  user: SessionUser,
  transferId: string,
): Promise<TransferDetail | null> {
  const transfer = await prisma.transfer.findFirst({
    where: { AND: [scopeTransferQuery(user), { id: transferId }] },
    select: {
      id: true,
      number: true,
      status: true,
      notes: true,
      createdAt: true,
      sentAt: true,
      receivedAt: true,
      originWarehouse: { select: { name: true } },
      destinationWarehouse: { select: { name: true } },
      createdBy: { select: { user: { select: { name: true } } } },
      lines: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          product: { select: { id: true, code: true, description: true } },
          serialUnit: { select: { serial: true } },
        },
      },
    },
  });
  if (!transfer) return null;
  const transitWarehouseId = await findTransitWarehouse(prisma);
  const progress = await loadTransferLines(
    prisma,
    transferId,
    transitWarehouseId,
  );
  return {
    id: transfer.id,
    number: transfer.number,
    transitWarehouseId,
    status: transfer.status,
    notes: transfer.notes,
    originName: transfer.originWarehouse.name,
    destinationName: transfer.destinationWarehouse.name,
    createdByName: transfer.createdBy.user.name,
    createdAt: transfer.createdAt.toISOString(),
    sentAt: transfer.sentAt?.toISOString() ?? null,
    receivedAt: transfer.receivedAt?.toISOString() ?? null,
    lines: transfer.lines.map((line) => {
      const p = progress.find((l) => l.id === line.id);
      return {
        id: line.id,
        productId: line.product.id,
        productCode: line.product.code,
        description: line.product.description,
        serial: line.serialUnit?.serial ?? null,
        sentQuantity: p?.quantitySent.toFixed(2) ?? "0.00",
        receivedQuantity: p?.receivedQuantity.toFixed(2) ?? "0.00",
        writtenOffQuantity: p?.writtenOffQuantity.toFixed(2) ?? "0.00",
        pendingQuantity:
          p && transfer.status !== "BORRADOR" && transfer.status !== "CANCELADO"
            ? pendingQuantity(p).toFixed(2)
            : "0.00",
      };
    }),
  };
}
