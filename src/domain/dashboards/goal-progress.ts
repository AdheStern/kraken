// src/domain/dashboards/goal-progress.ts
// Avance contra la meta (KGI) y variación contra el periodo anterior (AGENTS.md §6).
import Decimal from "decimal.js";

export type MonthlyGoal = { month: string; value: Decimal };

// REGLA: las metas son mensuales; la de un trimestre o un año es la suma de sus meses. Sin ninguna meta cargada
// en el periodo no hay meta (null), no una meta de cero.
export function goalForMonths(
  goals: readonly MonthlyGoal[],
  months: readonly string[],
): Decimal | null {
  const inPeriod = goals.filter((goal) => months.includes(goal.month));
  if (inPeriod.length === 0) return null;
  return inPeriod.reduce((acc, goal) => acc.plus(goal.value), new Decimal(0));
}

// POR QUÉ: se trunca como el % de las bolsas; 99.6% de la meta nunca se muestra como cumplida.
export function progressPct(
  actual: Decimal,
  goal: Decimal | null,
): number | null {
  if (!goal || !goal.greaterThan(0)) return null;
  return actual
    .dividedBy(goal)
    .times(100)
    .toDecimalPlaces(0, Decimal.ROUND_DOWN)
    .toNumber();
}

// Variación porcentual con un decimal; sin base (anterior en 0) no hay variación que mostrar.
export function variationPct(
  current: Decimal,
  previous: Decimal,
): number | null {
  if (previous.isZero()) return null;
  return current
    .minus(previous)
    .dividedBy(previous.abs())
    .times(100)
    .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
    .toNumber();
}

// Participación de una parte en el total, con un decimal; sin total no hay participación.
export function sharePctOf(part: Decimal, whole: Decimal): number | null {
  if (!whole.greaterThan(0)) return null;
  return part
    .dividedBy(whole)
    .times(100)
    .toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
    .toNumber();
}
