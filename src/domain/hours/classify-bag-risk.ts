// src/domain/hours/classify-bag-risk.ts
// Agrupa una bolsa para su seguimiento: en riesgo (consumo alto o vence pronto), activa o inactiva.
// Regla normativa: AGENTS.md §2.4 (alertas) y §6 (bolsas en riesgo: más del 80% o vencen en menos de 30 días).
import type { BagStatus } from "./bag-state-machine";
import { hasReachedThreshold } from "./crossed-thresholds";
import { isExpiryWarningDue } from "./expiry";

export type BagRiskGroup = "EN_RIESGO" | "ACTIVA" | "INACTIVA";

export type BagRiskReason = "CONSUMO" | "VENCIMIENTO";

type RiskInput = {
  status: BagStatus;
  soldMinutes: number;
  balanceMinutes: number;
  expiresOn: string | null;
};

// POR QUÉ: riskPct (80) y warningDays (30) vienen de los parámetros de alertas de horas (confirmados por DIMA).
export function classifyBagRisk(
  bag: RiskInput,
  today: string,
  { riskPct, warningDays }: { riskPct: number; warningDays: number },
): { group: BagRiskGroup; reasons: BagRiskReason[] } {
  if (bag.status !== "ACTIVA") return { group: "INACTIVA", reasons: [] };
  const reasons: BagRiskReason[] = [];
  if (hasReachedThreshold(bag, riskPct)) reasons.push("CONSUMO");
  if (isExpiryWarningDue(bag.expiresOn, today, warningDays))
    reasons.push("VENCIMIENTO");
  return { group: reasons.length > 0 ? "EN_RIESGO" : "ACTIVA", reasons };
}
