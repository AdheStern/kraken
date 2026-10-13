// src/server/hours/bag-alert-settings.ts
// Umbrales de alerta de las bolsas, editables sin desplegar (core.parametro; AGENTS.md §2.4 "Umbrales configurables").
import { getIntListParameter, getIntParameter } from "@/server/parameters";

export type BagAlertSettings = {
  thresholdsPct: number[];
  riskPct: number;
  warningDays: number;
};

// [CONFIRMAR] 80% y 100% de consumo, y aviso 30 días antes del vencimiento (AGENTS.md §2.4, §14).
const DEFAULT_THRESHOLDS_PCT = [80, 100];
const DEFAULT_WARNING_DAYS = 30;

export async function getBagAlertSettings(): Promise<BagAlertSettings> {
  const [thresholdsPct, warningDays] = await Promise.all([
    getIntListParameter("horas.alerta_consumo_pct", DEFAULT_THRESHOLDS_PCT),
    getIntParameter("horas.aviso_vencimiento_dias", DEFAULT_WARNING_DAYS),
  ]);
  return {
    thresholdsPct,
    riskPct: Math.min(...thresholdsPct),
    warningDays,
  };
}
