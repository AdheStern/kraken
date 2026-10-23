// src/features/dashboards/queries/load-dashboard-context.ts
// Lo común a cada tablero: filtros de la URL recortados a lo que el usuario puede elegir, opciones de la barra
// y los tableros que puede abrir (AGENTS.md §2.9 "Tableros", §6).
import type { Clock } from "@/domain/clock";
import type { PeriodKind } from "@/domain/dashboards/period";
import {
  canEditGoals,
  canSeeInventoryDashboard,
  canSeeOperationsDashboard,
  canSeeSalesDashboard,
} from "@/server/authz/dashboard-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { systemClock } from "@/server/clock";
import {
  type DashboardFilters,
  type PeriodOption,
  parseDashboardFilters,
  periodOptions,
  periodToken,
} from "../schemas/dashboard-filters";
import type { BoardKey } from "../types";
import { type FilterOptions, getFilterOptions } from "./get-filter-options";

export type DashboardContext = {
  filters: DashboardFilters;
  options: FilterOptions;
  periods: Record<PeriodKind, PeriodOption[]>;
  boards: BoardKey[];
  query: string;
};

type Params = Record<string, string | string[] | undefined>;

export async function loadDashboardContext(
  user: SessionUser,
  params: Params,
  clock: Clock = systemClock,
): Promise<DashboardContext> {
  const parsed = parseDashboardFilters(params, clock);
  const options = await getFilterOptions(user);
  // REGLA: un área o ciudad que el usuario no puede elegir se ignora; los alcances igual lo protegen (regla 7).
  const filters = {
    ...parsed,
    areaId: options.areas.some((a) => a.id === parsed.areaId)
      ? parsed.areaId
      : null,
    cityId: options.cities.some((c) => c.id === parsed.cityId)
      ? parsed.cityId
      : null,
  };
  const query = new URLSearchParams({
    periodo: periodToken(filters.period),
    ...(filters.areaId ? { area: filters.areaId } : {}),
    ...(filters.cityId ? { ciudad: filters.cityId } : {}),
  }).toString();
  return {
    filters,
    options,
    periods: {
      MES: periodOptions("MES", clock),
      TRIMESTRE: periodOptions("TRIMESTRE", clock),
      ANIO: periodOptions("ANIO", clock),
    },
    boards: visibleBoards(user),
    query,
  };
}

export function visibleBoards(user: SessionUser): BoardKey[] {
  const boards: BoardKey[] = [];
  if (canSeeSalesDashboard(user)) boards.push("ventas");
  if (canSeeOperationsDashboard(user)) boards.push("operacion");
  if (canSeeInventoryDashboard(user)) boards.push("inventario");
  if (canEditGoals(user)) boards.push("metas");
  return boards;
}
