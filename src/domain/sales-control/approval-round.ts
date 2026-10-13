// src/domain/sales-control/approval-round.ts
// Ronda de aprobación en paralelo de una versión: qué solicitudes se crean al enviar y cómo queda la
// ronda tras cada decisión. Regla normativa: AGENTS.md §2.3 y caso APROB-01.
import type Decimal from "decimal.js";

export type ApprovalTarget =
  | { kind: "AREA"; areaId: string }
  | { kind: "GERENCIA_GENERAL" };

export type RequestStatus = "PENDIENTE" | "APROBADA" | "RECHAZADA" | "CERRADA";

export type RoundRequest = { id: string; status: RequestStatus };

export type RoundOutcome =
  | { round: "EN_CURSO"; updates: RoundRequest[] }
  | { round: "APROBADA"; updates: RoundRequest[] }
  | { round: "OBSERVADA"; updates: RoundRequest[] };

// [CONFIRMAR] un rechazo cierra las solicitudes pendientes de la ronda (§2.3).
export const REJECTION_CLOSES_ROUND = true;

// REGLA: una solicitud por área presente en las líneas; el GG se suma si el total alcanza el umbral,
// evaluado por versión con el umbral congelado al enviar (§2.3).
export function computeApprovalTargets(
  lineAreaIds: readonly string[],
  totalSaleUsd: Decimal,
  thresholdUsd: Decimal,
): ApprovalTarget[] {
  const areas = [...new Set(lineAreaIds)].map((areaId) => ({
    kind: "AREA" as const,
    areaId,
  }));
  return totalSaleUsd.greaterThanOrEqualTo(thresholdUsd)
    ? [...areas, { kind: "GERENCIA_GENERAL" }]
    : areas;
}

// REGLA: todas deben aprobar; un rechazo deja la versión OBSERVADA y las decisiones ya tomadas se conservan.
export function decideInRound(
  requests: readonly RoundRequest[],
  decision: { requestId: string; status: "APROBADA" | "RECHAZADA" },
  {
    rejectionClosesRound = REJECTION_CLOSES_ROUND,
  }: { rejectionClosesRound?: boolean } = {},
): RoundOutcome | null {
  const target = requests.find((request) => request.id === decision.requestId);
  if (!target || target.status !== "PENDIENTE") return null;
  const decided = requests.map((r) =>
    r.id === decision.requestId ? { ...r, status: decision.status } : r,
  );
  const updates: RoundRequest[] = [
    { id: decision.requestId, status: decision.status },
  ];
  const pending = decided.filter((r) => r.status === "PENDIENTE");

  if (decided.some((r) => r.status === "RECHAZADA")) {
    if (rejectionClosesRound) {
      const closed = pending.map((r) => ({
        id: r.id,
        status: "CERRADA" as const,
      }));
      return { round: "OBSERVADA", updates: [...updates, ...closed] };
    }
    return { round: pending.length > 0 ? "EN_CURSO" : "OBSERVADA", updates };
  }
  return { round: pending.length > 0 ? "EN_CURSO" : "APROBADA", updates };
}
