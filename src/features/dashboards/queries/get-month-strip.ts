// src/features/dashboards/queries/get-month-strip.ts
// Cifras del mes en curso para la franja de Inicio, elegidas por rol con las mismas funciones de los tableros
// (AGENTS.md §5 navegación, §6): ventas y margen, SLA y bolsas en riesgo, o la utilización del ingeniero.
import { currentPeriodRef } from "@/domain/dashboards/period";
import { formatAmount } from "@/lib/format-amount";
import { formatMinutes } from "@/lib/format-minutes";
import {
  canSeeOperationsDashboard,
  canSeeSalesDashboard,
} from "@/server/authz/dashboard-permissions";
import { hasRole, type SessionUser } from "@/server/authz/roles";
import { systemClock } from "@/server/clock";
import { getOperationsDashboard } from "./get-operations-dashboard";
import { getSalesDashboard } from "./get-sales-dashboard";

export type StripItem = { label: string; value: string; hint: string };

export type MonthStrip = { periodLabel: string; items: StripItem[] } | null;

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

export async function getMonthStrip(user: SessionUser): Promise<MonthStrip> {
  const period = currentPeriodRef("MES", systemClock);
  const filters = { period, areaId: null, cityId: null };
  const [sales, ops] = await Promise.all([
    canSeeSalesDashboard(user)
      ? getSalesDashboard(user, { ...filters, dimension: "AREA" })
      : null,
    canSeeOperationsDashboard(user)
      ? getOperationsDashboard(user, filters)
      : null,
  ]);
  const items: StripItem[] = [];
  if (sales) {
    items.push(
      {
        label: "Ventas aprobadas",
        value: `US$ ${formatAmount(sales.sales.valueUsd)}`,
        hint: sales.sales.goalUsd
          ? `${sales.sales.progressPct ?? 0}% de la meta`
          : `${sales.cvCount} CV cerrados`,
      },
      {
        label: "Margen bruto",
        value: `US$ ${formatAmount(sales.margin.valueUsd)}`,
        hint: sales.margin.marginPct
          ? `${sales.margin.marginPct}%`
          : "Sin costo",
      },
    );
  }
  // POR QUÉ: el ingeniero ve su propio trabajo; gerencia, el cumplimiento y lo que está en riesgo.
  if (ops && hasRole(user, "INGENIERO") && ops.utilization.length === 1) {
    const [me] = ops.utilization;
    items.push(
      {
        label: "Mi utilización",
        value: pct(me.pct),
        hint: `${formatMinutes(me.loggedMinutes)} registradas`,
      },
      {
        label: "Registros tardíos",
        value: pct(ops.lateEntriesPct),
        hint: "Cargados 48 h después",
      },
    );
  } else if (ops) {
    items.push(
      {
        label: "SLA de resolución",
        value: pct(ops.sla.resolution.pct),
        hint: `${ops.sla.resolution.missed} incumplidos`,
      },
      {
        label: "Bolsas en riesgo",
        value: String(ops.bagsAtRisk.count),
        hint: "Hoy",
      },
    );
  }
  const periodLabel = sales?.periodLabel ?? ops?.periodLabel ?? "";
  return items.length > 0 ? { periodLabel, items } : null;
}
