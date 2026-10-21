// src/features/inventory/queries/list-transfers.ts
// Traspasos visibles (scopeTransferQuery): primero los que siguen en camino, con lo enviado y lo que aún está en
// TRANSITO (AGENTS.md §2.8).
import Decimal from "decimal.js";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTransferQuery } from "@/server/authz/scope-transfer-query";
import { prisma } from "@/server/db";
import type { TransferRow } from "../types";

// LIMITACIÓN: los 200 más recientes; los cerrados antiguos se consultan en el kardex.
const LIMIT = 200;
const OPEN = ["BORRADOR", "EN_TRANSITO", "RECIBIDO_CON_DIFERENCIAS"];

export async function listTransfers(user: SessionUser): Promise<TransferRow[]> {
  const transfers = await prisma.transfer.findMany({
    where: scopeTransferQuery(user),
    orderBy: { number: "desc" },
    take: LIMIT,
    select: {
      id: true,
      number: true,
      status: true,
      createdAt: true,
      originWarehouse: { select: { name: true } },
      destinationWarehouse: { select: { name: true } },
      lines: {
        select: {
          quantitySent: true,
          movementLines: {
            where: {
              quantity: { lt: 0 },
              movement: { warehouse: { kind: "TRANSITO" } },
            },
            select: { quantity: true },
          },
        },
      },
    },
  });
  return transfers
    .map((t) => {
      const sent = t.lines.reduce(
        (s, l) => s.plus(l.quantitySent.toString()),
        new Decimal(0),
      );
      const settled = t.lines
        .flatMap((l) => l.movementLines)
        .reduce(
          (s, m) => s.plus(new Decimal(m.quantity.toString()).abs()),
          new Decimal(0),
        );
      return {
        id: t.id,
        number: t.number,
        status: t.status,
        originName: t.originWarehouse.name,
        destinationName: t.destinationWarehouse.name,
        createdAt: t.createdAt.toISOString(),
        sentQuantity: sent.toFixed(2),
        pendingQuantity:
          t.status === "BORRADOR" || t.status === "CANCELADO"
            ? "0.00"
            : sent.minus(settled).toFixed(2),
      };
    })
    .sort(
      (a, b) =>
        Number(OPEN.includes(b.status)) - Number(OPEN.includes(a.status)),
    );
}
