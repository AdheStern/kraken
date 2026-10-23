// src/features/dashboards/queries/get-goals-grid.ts
// Grilla de metas de un año para un indicador: una fila por área que el usuario puede definir (más la de la
// empresa para el GG) y una celda por mes (AGENTS.md §6, §2.9 "Tableros"). Pasa por scopeGoalQuery.
import Decimal from "decimal.js";
import type { GoalIndicator } from "@/generated/prisma/enums";
import { canEditGoal } from "@/server/authz/dashboard-permissions";
import {
  areaIdsWithRole,
  hasRole,
  type SessionUser,
} from "@/server/authz/roles";
import { scopeGoalQuery } from "@/server/authz/scope-goal-query";
import { prisma } from "@/server/db";

export type GoalRow = {
  areaId: string | null;
  label: string;
  values: string[];
};

const COMPANY_LABEL = "Empresa";

export async function getGoalsGrid(
  user: SessionUser,
  year: number,
  indicator: GoalIndicator,
): Promise<GoalRow[]> {
  const isGg = hasRole(user, "GERENTE_GENERAL");
  const [areas, goals] = await Promise.all([
    prisma.area.findMany({
      where: {
        isActive: true,
        ...(isGg ? {} : { id: { in: areaIdsWithRole(user, "GERENTE_AREA") } }),
      },
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    }),
    prisma.goal.findMany({
      where: { AND: [scopeGoalQuery(user), { year, indicator }] },
      select: { areaId: true, month: true, valueUsd: true, minutes: true },
    }),
  ]);
  const rows = [
    ...(isGg ? [{ areaId: null, label: COMPANY_LABEL }] : []),
    ...areas.map((a) => ({ areaId: a.id, label: a.code })),
  ].filter((row) => canEditGoal(user, row.areaId));
  return rows.map((row) => ({
    ...row,
    values: Array.from({ length: 12 }, (_, i) => {
      const goal = goals.find(
        (g) => g.areaId === row.areaId && g.month === i + 1,
      );
      if (!goal) return "";
      // REGLA: las horas se guardan en minutos (regla 4) y se muestran en horas para editarlas.
      return goal.valueUsd
        ? goal.valueUsd.toFixed(2)
        : new Decimal(goal.minutes ?? 0).dividedBy(60).toString();
    }),
  }));
}
