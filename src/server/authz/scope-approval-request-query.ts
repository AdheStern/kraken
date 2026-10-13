// src/server/authz/scope-approval-request-query.ts
// Solicitudes de aprobación que el usuario puede decidir (AGENTS.md §2.9, fila "CV: aprobar").
// REGLA: la bandeja de aprobaciones lista solo lo que este filtro devuelve (regla 7); coincide con
// canDecideApproval: el GG decide las de gerencia general y el gerente, las de sus áreas.
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.CvApprovalRequestWhereInput = { id: { in: [] } };

export function scopeApprovalRequestQuery(
  user: SessionUser,
): Prisma.CvApprovalRequestWhereInput {
  const decidable: Prisma.CvApprovalRequestWhereInput[] = [];
  if (hasRole(user, "GERENTE_GENERAL")) {
    decidable.push({ kind: "GERENCIA_GENERAL" });
  }
  const managedAreaIds = areaIdsWithRole(user, "GERENTE_AREA");
  if (managedAreaIds.length > 0) {
    decidable.push({ kind: "AREA", areaId: { in: managedAreaIds } });
  }
  return decidable.length > 0 ? { OR: decidable } : NOTHING;
}
