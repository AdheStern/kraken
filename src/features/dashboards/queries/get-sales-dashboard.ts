// src/features/dashboards/queries/get-sales-dashboard.ts
// Tablero económico de un periodo: ventas, margen, factor, horas vendidas contra el periodo anterior y la meta,
// serie mensual y desglose por una dimensión (AGENTS.md §6). El alcance lo ponen loadSaleFacts y loadGoals.
import Decimal from "decimal.js";
import {
  goalForMonths,
  progressPct,
  sharePctOf,
  variationPct,
} from "@/domain/dashboards/goal-progress";
import {
  type PeriodRef,
  previousPeriodRef,
  resolvePeriod,
} from "@/domain/dashboards/period";
import { summarizeSales } from "@/domain/dashboards/sale-amounts";
import {
  breakdownSales,
  monthlySales,
  type SaleFact,
  type SalesDimension,
  totalSales,
} from "@/domain/dashboards/sales-breakdown";
import type { SessionUser } from "@/server/authz/roles";
import type { MoneyKpi, SalesBreakdownRow, SalesDashboard } from "../types";
import { loadDimensionLabels } from "./load-dimension-labels";
import { loadGoals } from "./load-goals";
import { loadSaleFacts } from "./load-sale-facts";

export type SalesDashboardInput = {
  period: PeriodRef;
  areaId: string | null;
  cityId: string | null;
  dimension: SalesDimension;
};

const NO_KEY_LABEL = "Sin asignar";

export async function getSalesDashboard(
  user: SessionUser,
  input: SalesDashboardInput,
): Promise<SalesDashboard> {
  const period = resolvePeriod(input.period);
  const previous = resolvePeriod(previousPeriodRef(input.period));
  const scope = { areaId: input.areaId, cityId: input.cityId };
  const [facts, previousFacts, salesGoals, marginGoals, hourGoals] =
    await Promise.all([
      loadSaleFacts(user, { ...scope, start: period.start, end: period.end }),
      loadSaleFacts(user, {
        ...scope,
        start: previous.start,
        end: previous.end,
      }),
      loadGoals(user, "VENTAS_USD", period.months, input.areaId),
      loadGoals(user, "MARGEN_USD", period.months, input.areaId),
      loadGoals(user, "HORAS_VENDIDAS", period.months, input.areaId),
    ]);
  const now = summarizeSales(totalSales(facts).amounts);
  const before = summarizeSales(totalSales(previousFacts).amounts);
  const hoursGoal = goalForMonths(hourGoals, period.months);
  return {
    periodLabel: period.label,
    previousLabel: previous.label,
    sales: moneyKpi(
      now.saleUsd,
      before.saleUsd,
      goalForMonths(salesGoals, period.months),
    ),
    margin: {
      ...moneyKpi(
        now.marginUsd,
        before.marginUsd,
        goalForMonths(marginGoals, period.months),
      ),
      marginPct: now.marginPct?.toFixed(2) ?? null,
    },
    factor: now.factor?.toFixed(2) ?? null,
    ownServicesUsd: now.ownServicesSaleUsd.toFixed(2),
    hoursSold: {
      minutes: now.hoursMinutes,
      previousMinutes: before.hoursMinutes,
      variationPct: variationPct(
        new Decimal(now.hoursMinutes),
        new Decimal(before.hoursMinutes),
      ),
      goalMinutes: hoursGoal?.toNumber() ?? null,
      progressPct: progressPct(new Decimal(now.hoursMinutes), hoursGoal),
    },
    cvCount: totalSales(facts).cvCount,
    monthly: monthlySales(facts, period.months).map(({ month, amounts }) => ({
      month,
      saleUsd: amounts.saleUsd.toFixed(2),
      goalUsd: goalForMonths(salesGoals, [month])?.toFixed(2) ?? null,
    })),
    breakdown: {
      dimension: input.dimension,
      rows: await breakdownRows(facts, input.dimension, now.saleUsd),
    },
  };
}

function moneyKpi(
  value: Decimal,
  previous: Decimal,
  goal: Decimal | null,
): MoneyKpi {
  return {
    valueUsd: value.toFixed(2),
    previousUsd: previous.toFixed(2),
    variationPct: variationPct(value, previous),
    goalUsd: goal?.toFixed(2) ?? null,
    progressPct: progressPct(value, goal),
  };
}

async function breakdownRows(
  facts: readonly SaleFact[],
  dimension: SalesDimension,
  totalSaleUsd: Decimal,
): Promise<SalesBreakdownRow[]> {
  const groups = breakdownSales(facts, dimension);
  const ids = groups.flatMap((g) => (g.key ? [g.key] : []));
  const labels = await loadDimensionLabels(dimension, ids);
  return groups.map((group) => {
    const summary = summarizeSales(group.amounts);
    return {
      key: group.key,
      label: (group.key && labels.get(group.key)) || NO_KEY_LABEL,
      saleUsd: summary.saleUsd.toFixed(2),
      marginUsd: summary.marginUsd.toFixed(2),
      marginPct: summary.marginPct?.toFixed(2) ?? null,
      cvCount: group.cvCount,
      sharePct: sharePctOf(summary.saleUsd, totalSaleUsd),
    };
  });
}
