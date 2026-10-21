// src/features/inventory/queries/count-transfers-in-transit.ts
// Traspasos con algo todavía en camino, para el inicio de quien opera inventario (AGENTS.md §2.8).
import type { SessionUser } from "@/server/authz/roles";
import { scopeTransferQuery } from "@/server/authz/scope-transfer-query";
import { prisma } from "@/server/db";

export function countTransfersInTransit(user: SessionUser): Promise<number> {
  return prisma.transfer.count({
    where: {
      AND: [
        scopeTransferQuery(user),
        { status: { in: ["EN_TRANSITO", "RECIBIDO_CON_DIFERENCIAS"] } },
      ],
    },
  });
}
