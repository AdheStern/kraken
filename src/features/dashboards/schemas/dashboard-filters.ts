// src/features/dashboards/schemas/dashboard-filters.ts
// Filtros de los tableros leídos de la URL: periodo ("2026-10", "2026-T4" o "2026"), área, ciudad y desglose
// (AGENTS.md §6). Lo inválido cae al valor por defecto en vez de romper la pantalla.
import type { Clock } from "@/domain/clock";
import {
  currentPeriodRef,
  monthKey,
  type PeriodKind,
  type PeriodRef,
  previousPeriodRef,
  resolvePeriod,
} from "@/domain/dashboards/period";
import type { SalesDimension } from "@/domain/dashboards/sales-breakdown";

export type DashboardFilters = {
  period: PeriodRef;
  areaId: string | null;
  cityId: string | null;
  dimension: SalesDimension;
};

type Params = Record<string, string | string[] | undefined>;

const DIMENSIONS: readonly SalesDimension[] = [
  "AREA",
  "COMERCIAL",
  "CLIENTE",
  "TECNOLOGIA",
  "CIUDAD",
];

const MONTH = /^(\d{4})-(\d{2})$/;
const QUARTER = /^(\d{4})-T([1-4])$/;
const YEAR = /^(\d{4})$/;

export function parseDashboardFilters(
  params: Params,
  clock: Clock,
): DashboardFilters {
  const desglose = single(params.desglose)?.toUpperCase();
  return {
    period: parsePeriod(single(params.periodo), clock),
    areaId: single(params.area),
    cityId: single(params.ciudad),
    dimension: DIMENSIONS.find((d) => d === desglose) ?? "AREA",
  };
}

export function periodToken(ref: PeriodRef): string {
  if (ref.kind === "MES") return monthKey(ref.year, ref.index);
  if (ref.kind === "TRIMESTRE") return `${ref.year}-T${ref.index}`;
  return String(ref.year);
}

function parsePeriod(token: string | null, clock: Clock): PeriodRef {
  const month = token?.match(MONTH);
  if (month && Number(month[2]) >= 1 && Number(month[2]) <= 12)
    return ref("MES", month[1], month[2]);
  const quarter = token?.match(QUARTER);
  if (quarter) return ref("TRIMESTRE", quarter[1], quarter[2]);
  const year = token?.match(YEAR);
  if (year) return ref("ANIO", year[1], "1");
  return currentPeriodRef("MES", clock);
}

function ref(kind: PeriodKind, year: string, index: string): PeriodRef {
  return { kind, year: Number(year), index: Number(index) };
}

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export type PeriodOption = { token: string; label: string };

const OPTION_COUNT: Record<PeriodKind, number> = {
  MES: 12,
  TRIMESTRE: 8,
  ANIO: 5,
};

// Periodos recientes para elegir, del en curso hacia atrás.
export function periodOptions(kind: PeriodKind, clock: Clock): PeriodOption[] {
  let current = currentPeriodRef(kind, clock);
  const options: PeriodOption[] = [];
  for (let i = 0; i < OPTION_COUNT[kind]; i++) {
    options.push({
      token: periodToken(current),
      label: resolvePeriod(current).label,
    });
    current = previousPeriodRef(current);
  }
  return options;
}
