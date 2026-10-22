// src/domain/dashboards/hours-kpis.ts
// Horas vendidas vs consumidas en un periodo, ponderadas y reales, y lo vencido sin usar (AGENTS.md §6).
import { type MovementTotals, summarizeBag } from "../hours/summarize-bag";

export type HoursFlow = {
  soldMinutes: number;
  consumedWeightedMinutes: number;
  consumedRealMinutes: number;
  expiredMinutes: number;
  surchargeMinutes: number;
};

// POR QUÉ: vendido, consumido y vencido salen de summarizeBag, la misma definición que cada bolsa; un periodo
// no tiene saldo propio. El recargo es lo que la ponderación (fuera de horario en 8x5) y el redondeo a 30 min
// sumaron sobre el tiempo real.
export function summarizeHoursFlow(
  movements: MovementTotals,
  consumedRealMinutes: number,
): HoursFlow {
  const figures = summarizeBag(movements, 0);
  return {
    soldMinutes: figures.soldMinutes,
    consumedWeightedMinutes: figures.consumedMinutes,
    consumedRealMinutes,
    expiredMinutes: figures.expiredMinutes,
    surchargeMinutes: Math.max(
      0,
      figures.consumedMinutes - consumedRealMinutes,
    ),
  };
}
