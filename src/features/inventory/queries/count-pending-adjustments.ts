// src/features/inventory/queries/count-pending-adjustments.ts
// Ajustes que esperan la decisión del usuario, para el contador de la navegación (AGENTS.md §2.8, §2.9).
import { canDecideAdjustments } from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeAdjustmentRequestQuery } from "@/server/authz/scope-adjustment-request-query";
import { prisma } from "@/server/db";

export async function countPendingAdjustments(
  user: SessionUser,
): Promise<number> {
  if (!canDecideAdjustments(user)) return 0;
  return prisma.adjustmentRequest.count({
    where: {
      AND: [
        scopeAdjustmentRequestQuery(user),
        // REGLA: quien la pidió no la decide (§2.9).
        { status: "PENDIENTE", requestedById: { not: user.id } },
      ],
    },
  });
}
