// src/features/dashboards/queries/load-goals.ts
// Metas mensuales visibles de un indicador para un conjunto de meses (AGENTS.md §6). Pasa por scopeGoalQuery.
import Decimal from "decimal.js";
import type { MonthlyGoal } from "@/domain/dashboards/goal-progress";
import { monthKey } from "@/domain/dashboards/period";
import type { Prisma } from "@/generated/prisma/client";
import type { GoalIndicator } from "@/generated/prisma/enums";
import { hasRole, type SessionUser } from "@/server/authz/roles";
import { scopeGoalQuery } from "@/server/authz/scope-goal-query";
import { prisma } from "@/server/db";

// POR QUÉ: con un área elegida va la meta de esa área; sin área, el GG y Administración ven la de la empresa y
// el gerente de área la suma de las suyas (lo que su tablero muestra).
export async function loadGoals(
  user: SessionUser,
  indicator: GoalIndicator,
  months: readonly string[],
  areaId: string | null,
): Promise<MonthlyGoal[]> {
  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))];
  const goals = await prisma.goal.findMany({
    where: {
      AND: [
        scopeGoalQuery(user),
        { indicator, year: { in: years } },
        areaFilter(user, areaId),
      ],
    },
    select: { year: true, month: true, valueUsd: true, minutes: true },
  });
  return goals
    .map((goal) => ({
      month: monthKey(goal.year, goal.month),
      value: new Decimal(
        goal.valueUsd?.toString() ?? String(goal.minutes ?? 0),
      ),
    }))
    .filter((goal) => months.includes(goal.month));
}

function areaFilter(
  user: SessionUser,
  areaId: string | null,
): Prisma.GoalWhereInput {
  if (areaId) return { areaId };
  const seesCompany =
    hasRole(user, "GERENTE_GENERAL") || hasRole(user, "ADMINISTRACION");
  return seesCompany ? { areaId: null } : {};
}
