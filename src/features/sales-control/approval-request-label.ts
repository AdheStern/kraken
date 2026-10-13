// src/features/sales-control/approval-request-label.ts
// Nombre visible de una solicitud de aprobación: "Gerente DIMANET" o "Gerencia general".
import type { ApprovalKind } from "@/generated/prisma/enums";

export function approvalRequestLabel(
  kind: ApprovalKind,
  areaCode: string | null,
): string {
  return kind === "GERENCIA_GENERAL"
    ? "Gerencia general"
    : `Gerente ${areaCode ?? "de área"}`;
}
