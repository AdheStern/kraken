// src/features/sales-control/approver-labels.ts
// Aprobadores que se generarán al enviar, con la misma regla que usa el servidor (computeApprovalTargets).
import Decimal from "decimal.js";
import { computeApprovalTargets } from "@/domain/sales-control/approval-round";
import type { LinesSummary } from "./line-pricing";
import type { Option } from "./types";

export function approverLabels(
  summary: LinesSummary,
  areas: Option[],
  thresholdUsd: string,
): string[] {
  const targets = computeApprovalTargets(
    summary.areaIds,
    summary.totals.totalSaleUsd,
    new Decimal(thresholdUsd),
  );
  return targets.map((target) =>
    target.kind === "GERENCIA_GENERAL"
      ? "Gerente general"
      : `Gerente ${areas.find((area) => area.id === target.areaId)?.label ?? "de área"}`,
  );
}
