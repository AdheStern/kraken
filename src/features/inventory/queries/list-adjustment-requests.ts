// src/features/inventory/queries/list-adjustment-requests.ts
// Solicitudes de ajuste visibles (scopeAdjustmentRequestQuery): primero las pendientes, con lo que cambia cada una
// y si el usuario puede decidirla (AGENTS.md §2.8, §2.9).
import { canDecideAdjustment } from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeAdjustmentRequestQuery } from "@/server/authz/scope-adjustment-request-query";
import { prisma } from "@/server/db";
import { adjustmentLinesSchema } from "@/server/inventory/adjustments/adjustment-lines";
import type { AdjustmentRequestView } from "../types";

// LIMITACIÓN: las 100 más recientes; las decididas antiguas quedan en el kardex y la auditoría.
const LIMIT = 100;

export async function listAdjustmentRequests(
  user: SessionUser,
): Promise<AdjustmentRequestView[]> {
  const rows = await prisma.adjustmentRequest.findMany({
    where: scopeAdjustmentRequestQuery(user),
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: LIMIT,
    select: {
      id: true,
      status: true,
      origin: true,
      areaId: true,
      reason: true,
      lines: true,
      createdAt: true,
      requestedById: true,
      decisionComment: true,
      warehouse: { select: { name: true } },
      area: { select: { name: true } },
      requestedBy: { select: { user: { select: { name: true } } } },
      decidedBy: { select: { user: { select: { name: true } } } },
    },
  });
  const parsed = rows.map((r) => ({
    ...r,
    parsedLines: adjustmentLinesSchema.parse(r.lines),
  }));
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: [
          ...new Set(
            parsed.flatMap((r) => r.parsedLines.map((l) => l.productId)),
          ),
        ],
      },
    },
    select: { id: true, code: true, description: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return parsed.map((r) => ({
    id: r.id,
    status: r.status,
    origin: r.origin,
    warehouseName: r.warehouse.name,
    areaName: r.area?.name ?? null,
    reason: r.reason,
    requestedByName: r.requestedBy.user.name,
    createdAt: r.createdAt.toISOString(),
    decidedByName: r.decidedBy?.user.name ?? null,
    decisionComment: r.decisionComment,
    canDecide: r.status === "PENDIENTE" && canDecideAdjustment(user, r),
    lines: r.parsedLines.map((l) => ({
      productCode: byId.get(l.productId)?.code ?? "",
      description: byId.get(l.productId)?.description ?? "",
      delta: l.delta,
      serials: l.serials,
    })),
  }));
}
