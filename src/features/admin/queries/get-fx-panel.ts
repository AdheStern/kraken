// src/features/admin/queries/get-fx-panel.ts
// Panel del tipo de cambio (AGENTS.md §2.2): TC vigente, el anterior para la variación, serie de 90 días,
// TC promedio de los CV del mes e historial de cargas. Lee fx.tipo_cambio; nunca llama a la API (ADR-09).
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem.
import { addDays, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import {
  BUSINESS_TIME_ZONE,
  toBusinessDate,
} from "@/domain/calendar/business-date";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { findCurrentFxRate } from "@/server/fx/find-current-fx-rate";
import type { FxPanel, FxRateView } from "../types";

const SERIES_DAYS = 90;
const HISTORY_ROWS = 20;

type FxRow = NonNullable<Awaited<ReturnType<typeof findCurrentFxRate>>>;

export async function getFxPanel(): Promise<FxPanel> {
  const today = toBusinessDate(systemClock.now());
  const from = format(
    addDays(new Date(`${today}T12:00:00Z`), -SERIES_DAYS),
    "yyyy-MM-dd",
  );
  const [current, seriesRows, history, monthAverage] = await Promise.all([
    findCurrentFxRate(prisma, today),
    prisma.fxRate.findMany({
      where: { effectiveOn: { gte: day(from), lte: day(today) } },
      orderBy: [{ effectiveOn: "asc" }, { source: "asc" }],
    }),
    prisma.fxRate.findMany({
      orderBy: [{ effectiveOn: "desc" }, { source: "asc" }],
      take: HISTORY_ROWS,
      include: { createdBy: { select: { user: { select: { name: true } } } } },
    }),
    getMonthAverage(today),
  ]);
  const series = onePerDay(seriesRows);
  const previous = current
    ? [...series]
        .reverse()
        .find((p) => p.date < toDateText(current.effectiveOn))
    : undefined;
  return {
    today,
    current: current ? toView(current, null) : null,
    previousSellRate: previous?.sellRate ?? null,
    series,
    monthAverage,
    history: history.map((r) => toView(r, r.createdBy?.user.name ?? null)),
  };
}

// REGLA: el promedio es de las versiones de CV creadas en el mes de negocio; no incluye los CV de saldo inicial (§6).
async function getMonthAverage(
  today: string,
): Promise<FxPanel["monthAverage"]> {
  const monthStart = `${today.slice(0, 7)}-01`;
  const result = await prisma.cvVersion.aggregate({
    where: {
      createdAt: {
        gte: fromZonedTime(`${monthStart}T00:00:00`, BUSINESS_TIME_ZONE),
      },
      cv: { isOpeningBalance: false },
    },
    _avg: { saleFxRate: true, costFxRate: true },
    _count: true,
  });
  const { saleFxRate, costFxRate } = result._avg;
  if (!result._count || !saleFxRate || !costFxRate) return null;
  return {
    saleFxRate: saleFxRate.toFixed(4),
    costFxRate: costFxRate.toFixed(4),
    versions: result._count,
  };
}

// POR QUÉ: un mismo día puede tener TC del BCB y manual; vienen ordenados con el del BCB primero.
function onePerDay(rows: FxRow[]): FxPanel["series"] {
  const byDate = new Map<string, string>();
  for (const r of rows) {
    const date = toDateText(r.effectiveOn);
    if (!byDate.has(date)) byDate.set(date, toFxText(r.sellRate));
  }
  return [...byDate].map(([date, sellRate]) => ({ date, sellRate }));
}

function toView(r: FxRow, createdBy: string | null): FxRateView {
  return {
    effectiveOn: toDateText(r.effectiveOn),
    buyRate: toFxText(r.buyRate),
    sellRate: toFxText(r.sellRate),
    source: r.source,
    fetchedAt: r.fetchedAt.toISOString(),
    createdBy,
  };
}

// REGLA: el TC se muestra con 2 decimales salvo que tenga más (AGENTS.md §15.4).
const toFxText = (rate: FxRow["sellRate"]) =>
  rate.toFixed(Math.max(2, rate.decimalPlaces()));
const toDateText = (date: Date) => date.toISOString().slice(0, 10);
const day = (date: string) => new Date(`${date}T00:00:00Z`);
