// src/features/sales-control/queries/list-pending-approvals.ts
// Bandeja de aprobaciones: solicitudes pendientes que el usuario puede decidir, la más antigua primero
// (AGENTS.md §5, Bandeja de aprobaciones). Sin delegación: cada solicitud espera a su gerente (§2.3).
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { SessionUser } from "@/server/authz/roles";
import { scopeApprovalRequestQuery } from "@/server/authz/scope-approval-request-query";
import { prisma } from "@/server/db";
import { approvalRequestLabel } from "../approval-request-label";
import type { PendingApprovalItem } from "../types";

export async function listPendingApprovals(
  user: SessionUser,
): Promise<PendingApprovalItem[]> {
  const requests = await prisma.cvApprovalRequest.findMany({
    where: {
      AND: [
        scopeApprovalRequestQuery(user),
        { status: "PENDIENTE", version: { status: "EN_APROBACION" } },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      area: { select: { code: true } },
      version: {
        select: {
          number: true,
          title: true,
          totalSaleUsd: true,
          submittedAt: true,
          cv: {
            select: {
              id: true,
              code: true,
              customer: { select: { name: true } },
            },
          },
          approvalRequests: {
            where: { kind: "AREA" },
            select: { area: { select: { code: true } } },
          },
        },
      },
    },
  });

  return requests.map(({ id, kind, area, createdAt, version }) => ({
    requestId: id,
    cvId: version.cv.id,
    versionNumber: version.number,
    versionLabel: toCvVersionLabel(version.cv.code, version.number),
    title: version.title,
    customerName: version.cv.customer.name,
    totalSaleUsd: version.totalSaleUsd.toFixed(2),
    areaCodes: version.approvalRequests
      .flatMap((r) => (r.area ? [r.area.code] : []))
      .sort(),
    requestLabel: approvalRequestLabel(kind, area?.code ?? null),
    submittedAt: (version.submittedAt ?? createdAt).toISOString(),
  }));
}
